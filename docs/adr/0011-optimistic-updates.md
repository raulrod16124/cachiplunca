# ADR-0011: Optimistic updates y rollback

**Fecha:** 2026-10-12
**Estado:** Aceptado
**Tarea:** TASK-079 — Optimistic updates (`docs/mvp-backlog.md`)

## Contexto

El MVP de colaboración (§5 del backlog) declara **actualizaciones locales optimistas** con persistencia automática. `WorkspaceShellContainer` ya aplicaba los cambios locales de forma inmediata (`applyElements`) y persistía el delta en diferido con el `ElementPersistenceBatcher` (TASK-072/073), pero **no había reconciliación explícita ante un fallo de escritura**: el board conservaba el estado optimista y solo se mostraba "Not saved". ADR-0010 dejó TASK-079 como _optimistic/rollback_, construido sobre el reducer de cambios remotos sin reabrir el port ni el adapter.

El reto es revertir solo el cambio que no se pudo persistir sin pisar convergencia remota: mientras el write está en vuelo puede llegar una versión remota más nueva del mismo elemento.

## Decisión

1. **Helper puro en Application.** `rollbackFailedMutation(current, previous, next): readonly Element[]` en `src/application/services/optimistic-element-updates.ts`. Función pura, sin React ni Firebase, que dado el board actual y la ventana optimista `(previous, next)` de una mutación fallida devuelve el board reconciliado.

2. **Delta reutilizado.** Calcula la ventana con `computeElementDelta(previous, next)` (ya existente): `upserts` (creados o modificados por la mutación) y `removedIds` (borrados por la mutación). No duplica la noción de delta.

3. **Rollback por elemento con guard monótono.** El guard `isStrictlyNewer` (compartido con `applyRemoteElementChanges`) decide si el board actual ya fue superado por una versión estrictamente más nueva que la **optimista**:
   - **Modificado:** restaura la versión previa salvo que el actual sea estrictamente más nuevo que la optimista (un cambio remoto posterior ganó) o el elemento ya no esté en el board (fue borrado remotamente; no se resucita).
   - **Creado:** elimina el elemento optimista salvo que exista una versión remota estrictamente más nueva.
   - **Borrado:** re-añade la versión previa **solo si el id está ausente**; si está presente, lo dejó un cambio remoto y se respeta.

4. **No-op sin cambios.** Si nada aplica, devuelve **la misma referencia** del board (evita re-renders). El resultado se ordena con `sortElementsForLoad` (mismo orden determinista que la carga inicial y los cambios remotos).

5. **El batcher reporta el fallo.** `ElementPersistenceBatcherOptions` gana `onMutationFailed?: (mutation: { previous, next }, error: AppError) => void` (opcional y retrocompatible). En un flush fallido se invoca con la **ventana coalescida** de la mutación (el `previous` más antiguo y el `next` más reciente), tras `onResult` y antes de `emitStatus('error')`.

6. **Se descarta lo pendiente tras un fallo.** Las mutaciones pendientes derivan del estado optimista abortado; tras un fallo se cancelan (`dropPending`) para que el estado post-rollback quede consistente y el siguiente `schedule` parta de la base revertida. Los flushes exitosos nunca disparan `onMutationFailed`.

7. **Wiring en Presentation.** `WorkspaceShellContainer` pasa `onMutationFailed` al batcher y aplica `rollbackFailedMutation(elementsRef.current, previous, next)` (actualizando `elementsRef` + estado) solo si cambia la referencia. El surfacing del error (`persistenceError`) y el indicador de sync no cambian.

## Alternativas consideradas

- **No revertir (solo mostrar "Not saved"):** rechazada; deja estado fantasma que el servidor nunca confirmó.
- **Revertir todo el snapshot a `previous` sin guard:** rechazada; pisaría cambios remotos concurrentes (y el historial). El rollback por elemento con `updatedAt` es la frontera mínima segura.
- **Comparar contra la versión previa en lugar de la optimista:** rechazada; la propia mutación optimista incrementa `updatedAt`, por lo que se confundiría con una versión remota y no revertiría nada.
- **Integrar el rollback en el historial de undo/redo:** diferida a TASK-088 (historial local vs remotos); añadir entradas de historial al revertir complica la semántica de undo.
- **Last-Write-Wins completo / CRDT:** fuera de alcance (TASK-081 y no-CRDT por §5).

## Consecuencias

- El board refleja el cambio local al instante y, si la persistencia falla, revierte de forma determinista sin pisar versiones remotas más nuevas.
- La consistencia de convergencia completa (LWW, reconnect, historial vs remotos) sigue diferida a TASK-080/081/088; este helper se construye sobre el reducer de ADR-0010 sin reabrir el port ni el adapter.
- Fuera de alcance: CRDT, offline-first completo, presencia y cursores.
