# ADR-0016: Historial local frente a cambios remotos

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

ADR-0010 definió `applyRemoteElementChanges` (reducer puro) y ADR-0013 fijó la política de conflictos Last-Write-Wins por elemento. El historial de undo/redo (TASK-063–067) se apoyaba en `createSnapshotCommand`, que guarda **snapshots completos del board** (`previous`/`next`) y devuelve el snapshot fijo al hacer `execute`/`undo`/`redo`.

Los cambios remotos, en cambio, se aplican directamente al estado de Presentación (`elementsRef`/`elements`) mediante el reducer, **sin pasar por el historial**. Esto producía corrupción cuando ambos coexistían:

- Al pulsar undo, `history.undo()` devolvía un board previo a la llegada del cambio remoto; `onUndoElements` lo aplicaba y lo persistía, **pisando el cambio remoto**.
- El redo podía **resucitar** elementos que un cambio remoto ya había borrado.
- El historial ignoraba el board vivo en cada restauración.

ADR-0010/0011/0013 difirieron explícitamente este problema ("historial local frente a cambios remotos") a TASK-088.

## Decisión

1. **Comando de historial basado en ventana, no en snapshot fijo.** Nueva factoría `createBoardWindowCommand({ readCurrent, previous, next, label })` en `src/application/services/element-history.ts`. Es un `Command<readonly Element[]>` (ADR-0007) cuyas funciones `execute`/`undo` **reconcilian contra el board vivo** obtenido de `readCurrent`, en vez de devolver un snapshot congelado. Se conserva `createSnapshotCommand` intacto.

2. **Avance puro y con guard LWW.** Nuevo `applyElementWindow(current, previous, next)` en `src/application/services/optimistic-element-updates.ts`: reutiliza `computeElementDelta` y aplica el delta de la ventana sobre `current`.
   - **Upsert** de un elemento modificado/creado solo si `current` no tiene el id o si su versión **no** es estrictamente más nueva (`isStrictlyNewer`); una versión remota más nueva gana.
   - Un elemento que el comando solo **modificó** y que ya no está en `current` (borrado remoto) **no se resucita**.
   - **Removal**: se elimina del board si está presente.
   - Devuelve **la misma referencia** si no hay cambios y ordena con `sortElementsForLoad`.

3. **El reverso reutiliza el rollback existente.** La reversión (`undo`) es exactamente `rollbackFailedMutation(current, previous, next)` (ADR-0011), que ya revierte modificados a su versión previa, elimina creados y re-añade borrados con guard monótono y sin resucitar borrados remotos. No se duplica lógica.

4. **Wiring mínimo en Presentation.** `WorkspaceShellContainer` crea el comando con `readCurrent: () => elementsRef.current` en `commitElements` (delete/duplicate/paste) y en `handleTransformEnd` (gestos de move/resize). `useElementUndo`/`useElementRedo`, `handleUndoElements`/`handleRedoElements` y el batcher de persistencia **no cambian**.

5. **Sin cambios en el port ni en el adapter.** La reconciliación es lógica pura en Application; sigue apoyándose en `RealtimeSubscriptionManager` (ADR-0008) y no abre listeners nuevos (una única suscripción por workspace).

6. **Persistencia del resultado reconciliado.** El undo/redo sigue persistiendo el board resultante (comportamiento previo). La escritura es LWW sobre `updatedAt`, por lo que no reintroduce cambios ya superados.

## Alternativas consideradas

- **Invalidar el historial ante cualquier cambio remoto (`clear()`):** rechazada como solución principal; es simple y segura, pero degrada el undo local en un board colaborativo. Se documenta como fallback.
- **Sincronizar la base interna de `CommandHistory` con el board vivo:** rechazada; obliga a ampliar la API del historial y a coordinar su estado con la carga y los cambios remotos, con más superficie de regresión que la ventana con `readCurrent`.
- **Reconciliar el snapshot restaurado comparándolo con el board actual (sin conocer la ventana):** rechazada; no permite distinguir "ausente por borrado local" de "ausente por borrado remoto", provocando resurrecciones.
- **CRDT / versionado por contador:** fuera de alcance (ADR-0013). LWW por `updatedAt` es suficiente para el MVP.

## Consecuencias

- Undo/redo revierten/aplican **solo la intención local**; los cambios remotos de otros elementos sobreviven y los conflictos sobre el mismo elemento se resuelven por LWW.
- El historial y el feed remoto conviven sin corromper el estado ni crear listeners duplicados.
- Limitación conocida y documentada: si un elemento creado localmente fue borrado remotamente, un **redo** de esa creación puede re-añadirlo (no hay marca de tiempo de borrado en el MVP, ADR-0013 §6).
- Fuera de alcance: CRDT, offline-first completo y version history avanzada.
