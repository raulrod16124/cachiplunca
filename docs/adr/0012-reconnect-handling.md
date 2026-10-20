# ADR-0012: Reconnect handling

**Fecha:** 2026-10-12
**Estado:** Aceptado

## Contexto

El MVP de colaboración (§5 del backlog) exige que el board se mantenga en sincronía cuando la conexión se degrada y se recupera. Firestore **reconecta internamente** y reutiliza el listener: con `includeMetadataChanges: true` (ADR-0009) el SDK emite snapshots cuya metadata `fromCache` distingue lo servido desde caché local (sin back-end) de lo confirmado por el servidor. Hasta ahora el port (ADR-0008) solo entregaba cambios de elementos y errores; no había forma de **observar el estado de conexión** ni de reaccionar a la recuperación (flush de persistencia pendiente y limpieza del aviso de colaboración).

El reto es exponer la reconexión sin duplicar listeners, sin dejar que el resolver motivo (Firestore) se filtre a Application/Presentation, y sin reabrir la semántica de cambios de elementos.

## Decisión

1. **Señal de conexión en el port.** `RealtimePort.subscribe` gana un cuarto parámetro **opcional y retrocompatible** `onConnectionChange?: (status: RealtimeConnectionStatus) => void`, con `RealtimeConnectionStatus = 'connected' | 'reconnecting'`. Se mantiene la frontera unidireccional de lectura (ADR-0008): sigue sin haber `publish` ni camino de escritura nuevo.

2. **El adapter traduce la metadata, no la inventa.** `createFirebaseRealtimeAdapter` deriva el estado de `snapshot.metadata.fromCache` (`true → reconnecting`, `false → connected`) y marca `reconnecting` ante un error del stream. **Emite solo ante cambio de estado** (dedupe interno), incluido el snapshot inicial, de modo que arrancar en caché reporta `reconnecting` sin parpadeos cuando el primer snapshot ya es del servidor.

3. **Fan-out en el gestor.** `RealtimeSubscriptionManager` mantiene un `Set<RealtimeConnectionListener>` por canal y hace fan-out igual que con `onError`. Se sigue abriendo **una única** suscripción al port por workspace; los consumidores de estado comparten esa suscripción y se desregistran al darse de baja. El cleanup del canal y `dispose()` permanecen inalterados ("no se crean listeners duplicados").

4. **Estado en Application, puro y testeable.** Nuevo `createRealtimeConnectionStore(initial = 'connected')` en `src/application/services/realtime-connection-store.ts`, con el patrón `getSnapshot`/`subscribe`/`setStatus` de `selection-store`: snapshot inmutable, dedupe y **misma referencia** cuando el estado no cambia (no-op sin re-render). Sin React ni Firebase.

5. **Reacción a la reconexión en Presentation.** `WorkspaceShellContainer` crea el store, lo lee con `useSyncExternalStore` y se suscribe al gestor pasando `onConnectionChange`. Un efecto detecta la transición `reconnecting → connected` (estado previo en un `useRef`) y, al completarse, hace `persistenceBatcher.flush()` (persiste lo pendiente del debounce) y limpia `collaborationError`. `WorkspaceShellLayout` muestra un `Badge` de `@raulrod/ui` (`describeConnectionStatus`: `connected → null`, `reconnecting → warning "Reconnecting…"`) separado del indicador de sync.

## Alternativas consideradas

- **Conectividad del navegador (`navigator.onLine` + `online`/`offline`) en Presentation:** rechazada; es una señal gruesa que no refleja el estado real del stream ni las reconexiones internas de Firestore.
- **Detectar `fromCache` solo en el adapter y exponer un tipo específico de Firestore:** rechazada; filtraría el detalle del resolver a las capas internas y rompería la abstracción del port.
- **Nuevo método `observeConnection` separado en el port:** rechazada; duplicaría el lifecycle de suscripción y el riesgo de listeners extra, justo lo que el criterio prohíbe.
- **Empujar el flush/limpieza al port o al gestor:** rechazada; son consecuencias de composición/UI; mantener el estado como dato puro conserva a Application y al port libres de efectos.
- **LWW / CRDT / offline-first completo:** fuera de alcance (TASK-081 y no-CRDT por §5).

## Consecuencias

- El board indica "Reconnecting…" mientras el canal sirve caché y, al recuperar el servidor, persiste lo pendiente y retira el aviso de colaboración, sin abrir listeners adicionales.
- `RealtimeConnectionStatus` queda como vocabulario del port, reutilizable por presencia/cursores (TASK-082).
- Sigue fuera de alcance la estrategia de conflictos (TASK-081) y el historial frente a cambios remotos (TASK-088).
