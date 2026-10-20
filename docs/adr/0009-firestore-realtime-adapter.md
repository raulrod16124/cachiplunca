# ADR-0009: Adapter realtime sobre Firestore

**Fecha:** 2026-10-12
**Estado:** Aceptado

## Contexto

ADR-0008 definió `RealtimePort` como frontera unidireccional de lectura, _subsequent-only_, con eventos granulares que llevan `origin: 'local' | 'remote'`, errores por `onError(AppError)` y el `RealtimeSubscriptionManager` como punto único de lifecycle. TASK-077 debe materializar ese contrato sobre Firestore sin exponer el SDK a Application/Presentation y sin duplicar listeners.

El camino de escritura ya existe (`ElementRepository`, TASK-068/069); el adapter realtime solo observa cambios, por lo que no introduce un segundo camino de escritura. La colección `elements` y su mapper ya están fijados por TASK-069.

## Decisión

1. **Adapter factory + DI.** `createFirebaseRealtimeAdapter(db: Firestore)` en `src/infrastructure/firebase/firebase-realtime-adapter.ts`; el instance lo aporta `getFirebaseFirestore()`. El SDK de Firebase queda confinado a Infrastructure (ADR-0001/0002).

2. **Query sobre la colección top-level `elements` filtrada por `workspaceId`.** Se reutiliza `ELEMENTS_COLLECTION = 'elements'` y el mapper `fromElementDocument` de TASK-069, en vez de crear una abstracción o mapper paralelos. El id vive en la ruta del documento.

3. **`onSnapshot` con `{ includeMetadataChanges: true }`.** Es necesario para recibir los cambios que solo modifican metadata (`hasPendingWrites`), que son la señal de confirmación de una escritura local.

4. **Semántica _subsequent-only_.** El adapter descarta el primer `onSnapshot` (estado inicial) y solo emite cambios posteriores. La carga inicial sigue siendo responsabilidad de `load-workspace-elements` (TASK-070), evitando doble aplicación al abrir/recargar el board.

5. **`origin` derivado de metadata, no de un flag local.** `origin = doc.metadata.hasPendingWrites ? 'local' : 'remote'`. Se emiten también los cambios metadata-only, de modo que TASK-078/088 puedan observar la transición `local` → eco `remote` del mismo elemento. Consecuencia: un mismo id puede producir más de un `modified`; el consumidor decide si lo colapsa.

6. **Errores tipados por `onError`.** Cualquier fallo del canal (error del stream del SDK o documento que rompe invariantes de dominio) se entrega como `collaboration` + `ERROR_CODES.COLLABORATION_SYNC_FAILED`, con el error traducido por `mapFirebaseError` como `cause`. Sin `onError`, el fallo no propaga excepción (ADR-0008 §5).

7. **Lifecycle.** `subscribe` abre exactamente un `onSnapshot` y devuelve un `Unsubscribe` idempotente que lo cierra. El dedup por workspace lo sigue concentrando `createRealtimeSubscriptionManager` (TASK-076): el adapter no gestiona canales compartidos.

8. **Contrato reutilizable y mock extendido.** `src/test/fixtures/in-memory-firestore.ts` gana `onSnapshot` (snapshot con `docChanges()` y metadata) y helpers `__emitSnapshot`/`__emitError`/`__activeSnapshotListenerCount`; el contrato `describeRealtimePortContract` (TASK-076) se ejecuta contra el adapter con un harness que traduce eventos a documentos y snapshots.

## Alternativas consideradas

- **`onSnapshot` sin `includeMetadataChanges`:** rechazada porque impediría distinguir eco local de cambio remoto (`origin`) y la confirmación de escrituras.
- **Filtrar los cambios metadata-only:** rechazada porque perdería la transición `local` → `remote` que necesitan las tareas de reconciliación; el coste es eventos `modified` repetidos, gestionable por el consumidor.
- **Subcolección `workspaces/{id}/elements`:** rechazada por coherencia con TASK-069 (colección top-level + campo `workspaceId`); cambiarla reabriría el contrato del `ElementRepository`.
- **Replay del snapshot inicial en `subscribe`:** rechazada por ADR-0008 (doble aplicación de estado).

## Consecuencias

- TASK-078 (aplicar cambios remotos), TASK-080 (reconnect) y TASK-088 (eco local) se construyen sobre el port sin conocer Firestore.
- El wiring de composición y la aplicación de cambios remotos al board quedan fuera de TASK-077; la UI aún no consume el adapter.
- El adapter no persiste ni publica: las escrituras siguen por `ElementRepository`.
- Fuera de alcance y diferido: CRDT, offline-first completo, presencia (TASK-082) y cursores (TASK-084).
