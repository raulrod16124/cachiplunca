# ADR-0008: Puerto de colaboración realtime

**Fecha:** 2026-10-12
**Estado:** Aceptado
**Tarea:** TASK-076 — Realtime port (`docs/mvp-backlog.md`)

## Contexto

TASK-068 dejó `ElementRepository` (persistencia de elementos) y TASK-072/073 la orquestación y el autosave. La colaboración en tiempo real aún no tiene contrato: TASK-077 (adapter Firestore), TASK-078 (aplicar cambios remotos al board), TASK-080 (reconexión) y TASK-082/084 (presencia y cursores) dependen de una frontera de suscripción que evite exponer Firestore a Application/Presentation y que impida duplicar listeners por workspace.

El alcance de TASK-076 es solo el contrato y su lifecycle. Las escrituras ya tienen su camino (`ElementRepository`, TASK-068); el port realtime es unidireccional de lectura.

## Decisión

1. **`RealtimePort` vive en `src/application/ports/realtime-port.ts`** y opera con tipos de dominio (`WorkspaceId`, `Element`, `ElementId`). Un único método: `subscribe(workspaceId, listener, onError?): Unsubscribe`, simétrico con `AuthPort.observeSession` (ADR-0002). El `Unsubscribe = () => void` reutiliza `src/shared/types/unsubscribe.ts`.

2. **Eventos granulares con `origin` por cambio.** `ElementRealtimeEvent = { workspaceId, changes }` y `ElementRealtimeChange` se discrimina por `kind`: `added`/`modified` llevan el `Element` completo; `removed` lleva solo el `ElementId`. Cada cambio incluye `origin: 'local' | 'remote'`. Granularidad a nivel de cambio (no de elemento completo) permite que TASK-078 aplique el delta mínimo y que TASK-088 distinga eco local de cambio remoto.

3. **`subscribe` no publica ni reaplica el estado actual.** El contrato es _subsequent-only_: entrega únicamente los cambios posteriores a la suscripción; no hay replay del snapshot inicial. La carga inicial sigue siendo responsabilidad de `load-workspace-elements` (TASK-070). Consecuencia: el adapter Firestore (TASK-077) debe descartar el primer `onSnapshot` y Application reconcilia al crear/recargar el board, sin doble aplicación.

4. **Sin `publish` en el port.** Las escrituras locales siguen por `ElementRepository`; el eco que devuelve el backend llega etiquetado `origin: 'local'`. Esto mantiene una sola fuente de verdad para escribir, evita dos caminos de escritura divergentes y deja la marcación de origen en el adapter, que es quien conoce la procedencia.

5. **Los errores llegan por `onError(error: AppError)`**, opcional en `subscribe`. Se usa el kind `collaboration` con `ERROR_CODES.COLLABORATION_SYNC_FAILED` ya existente en `src/shared/errors/app-error.ts`; el adapter traduce los errores crudos con `mapFirebaseError`/`toAppError`. Sin `onError`, un fallo de la suscripción no debe propagar una excepción no controlada.

6. **`createRealtimeSubscriptionManager(port)` en `src/application/services/`** satisface el criterio "no se crean listeners duplicados": mantiene **una sola** suscripción al port por `WorkspaceId` (canal con `Set` de listeners y `Set` de error listeners) y hace fan-out. La suscripción al port se abre con el primer consumidor del workspace y se cierra cuando se da de baja el último; un canal cerrado puede reabrirse con un nuevo `subscribe`. `dispose()` cierra todos los canales. El `Unsubscribe` de cada consumidor es idempotente y el fan-out itera sobre una copia, por lo que un consumidor que se da de baja durante la entrega no rompe a los demás.

7. **`FakeRealtimePort` en `src/test/fixtures/fake-realtime-port.ts`** materializa el contrato antes del adapter: bus de eventos en memoria con `emit`/`emitError` y `activeSubscriptionCount`. El contrato reutilizable `describeRealtimePortContract` (`src/test/contract/realtime-port-contract.ts`) se expresa sobre un `RealtimePortHarness` (port + controles de emisión) para que TASK-077 pueda construir su propio harness sobre Firestore mockeado.

## Consecuencias

- TASK-078/080/082/084/086/087/088 pueden implementarse sobre el port y el gestor sin conocer Firestore (verificado: `src/application`, `src/domain` y `src/presentation` no importan `firebase/*`).
- TASK-077 debe cumplir la semántica subsequent-only (descartar el snapshot inicial) y marcar `origin`, además de traducir errores; cualquier divergencia la detectará el contrato reutilizable.
- El gestor concentra el ciclo de vida: Presentation se suscribe al manager por workspace y no gestiona listeners del backend.
- Fuera de alcance y explícitamente diferido: CRDT, offline-first completo, aplicación de cambios remotos al estado del board (TASK-078) y ampliación a presencia/cursores (TASK-082/084).
