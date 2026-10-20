# ADR-0010: Aplicación de cambios remotos al board

**Fecha:** 2026-10-12
**Estado:** Aceptado

## Contexto

ADR-0008 definió `RealtimePort` (frontera de lectura _subsequent-only_ con eventos granulares y `origin`) y su gestor de suscripciones; ADR-0009 materializó el adapter Firestore. TASK-078 debe **consumir** ese feed en la UI y reconciliarlo con el estado del board que ya carga `load-workspace-elements` (TASK-070) y que el usuario muta y persiste vía el batcher (TASK-072/073).

El feed entrega, por cada cambio, `origin: 'local' | 'remote'`. Las escrituras locales generan primero un cambio `local` (con `hasPendingWrites`) y luego un eco `remote` (ADR-0009 §5). Sin reglas claras, aplicar el feed produciría ecos duplicados, reescrituras en bucle y parpadeos de orden.

## Decisión

1. **Reducer puro en Application.** `applyRemoteElementChanges(current, event): readonly Element[]` en `src/application/services/remote-element-updates.ts`. Es una función pura, sin React ni Firebase, que dado el board actual y un `ElementRealtimeEvent` devuelve el board resultante. Aplicable y testeable de forma aislada.

2. **Ignorar `origin: 'local'`.** Los cambios locales ya están en el estado (los aplicó la propia interacción), así que el reducer los descarta y **no** los re-persiste. Esto corta el bucle de eco: el board no reinvoca al batcher por cambios propios. El eco `remote` posterior del mismo elemento sí se aplica (no cambia el dato, o pasa el guard de §4).

3. **Sin camino de escritura nuevo.** El reducer solo actualiza el estado de Presentación (`applyElements`), nunca el `ElementPersistenceOrchestrator`. Las escrituras siguen siendo responsabilidad exclusiva de la interacción del usuario (TASK-072/073). Aplicar cambios remotos no persiste.

4. **Guard monotónico mínimo por `updatedAt`.** En `added`/`modified`, el elemento entrante reemplaza al existente solo si es nuevo o si `updatedAt` es **estrictamente mayor**. Se ignoran los cambios con `updatedAt` igual o anterior. Es un guard deliberadamente mínimo: resuelve el orden básico (un eco antiguo no pisa un cambio más reciente) sin introducir Last-Write-Wins completo, resolución de empates ni versionado — eso queda explícitamente para TASK-081.

5. **Aislamiento por workspace.** Los elementos cuyo `workspaceId` no coincide con el del evento se descartan (defensa en profundidad; la suscripción ya está acotada por workspace).

6. **Orden determinista y no-op sin cambios.** Tras aplicar el delta, el resultado se ordena con el mismo `sortElementsForLoad` que la carga inicial (TASK-070) para que el render sea reproducible y consistente. Si ningún cambio aplica, el reducer devuelve **la misma referencia** de array, evitando re-renders innecesarios.

7. **Suscripción acotada al board cargado.** En `WorkspaceShellContainer`, la suscripción se abre cuando el board pasa a `success` y se cierra en el cleanup del efecto; se apoya en `RealtimeSubscriptionManager` (TASK-076), que garantiza **una sola** suscripción al port por workspace aunque haya varios consumidores. El `Unsubscribe` es idempotente y no se crean listeners duplicados.

8. **Errores de colaboración explícitos.** El `onError` del feed se traduce a un estado `collaborationError` que la Presentation muestra como `role="alert"` (helper `describeCollaborationSyncError`), sin romper el board.

## Alternativas consideradas

- **Aplicar también los cambios `local`:** rechazada; duplicaría el estado ya aplicado y abriría un bucle de re-persistencia.
- **Persistir los cambios remotos aplicados:** rechazada; el feed es de lectura y persistir en ambos sentidos genera ecos y conflictos de escritura.
- **Last-Write-Wins completo (comparar `updatedAt` con desempate por id/reloj):** diferida a TASK-081; el guard monotónico cubre el caso observado (eco antiguo) sin fijar semántica de conflicto prematura.
- **Reconciliar contra el snapshot inicial del port:** rechazada por ADR-0008 (el port es _subsequent-only_); la carga inicial sigue siendo `load-workspace-elements`.

## Consecuencias

- La UI refleja en vivo altas, modificaciones (posición, tamaño, estado) y borrados remotos, sin persistirlos ni duplicar listeners.
- El orden de render es el mismo en carga inicial y en cambios remotos.
- TASK-079 (optimistic/rollback), TASK-080 (reconnect), TASK-081 (conflictos LWW) y TASK-088 (eco local) se construyen sobre este reducer sin reabrir el port ni el adapter.
- Fuera de alcance y diferido: CRDT, offline-first completo, presencia (TASK-082) y cursores (TASK-084).
