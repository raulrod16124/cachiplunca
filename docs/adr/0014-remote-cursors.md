# ADR-0014: Remote cursors sobre el canal de presencia

**Fecha:** 2026-10-12
**Estado:** Aceptado
**Tarea:** TASK-084 — Remote cursors (`docs/mvp-backlog.md`)

## Contexto

La colaboración del MVP (§5 del backlog) requiere mostrar los **cursores de los demás usuarios** en el lienzo. TASK-082 ya introdujo la presencia efímera (`Presence` con `userId`, `workspaceId`, `lastSeenAt`), el `PresencePort` y su adapter sobre la colección `presence`; TASK-083 añadió el store de usuarios conectados. Faltaba decidir **dónde viaja el cursor** y **cómo se emite y consume**.

Restricciones relevantes del MVP:

- La presencia es **estado efímero**: no debe tocar ni bloquear el documento persistido de elementos.
- Nada de CRDT/offline-first; un canal simple con vocabulario realtime (ADR-0012) es suficiente.
- “No se crean listeners duplicados” y “gestionar lifecycle y cleanup de suscripciones” son criterios de aceptación.
- El pointer move es de **alta frecuencia** (decenas de eventos por segundo), por lo que no puede publicarse en Firestore sin control de ritmo.

## Decisión

1. **El cursor viaja en la presencia, no en el documento de elementos.** Se extiende el modelo de dominio `Presence` con un campo opcional `cursor: Position | null`. Así el cursor reutiliza la suscripción de presencia ya existente (una por workspace), no requiere colección ni port nuevos, y queda garantizado que **no modifica ni bloquea** `elements` (criterio explícito).

2. **Modelo inmutable y aditivo.** `Presence.moveCursor(cursor)` devuelve una nueva instancia (no-op por referencia si la posición no cambia); `refresh` conserva el cursor; `equals`/`toJSON` lo incluyen. La serialización es **retrocompatible**: `toPresenceDocument` omite `cursor` cuando es `null` y `fromPresenceDocument` tolera su ausencia o `null`, de modo que documentos de presencia previos siguen siendo válidos.

3. **Emisión local con throttle en Application.** Nuevo `createCursorBroadcaster` (`src/application/services/cursor-broadcaster.ts`), puro y sin React: aplica un throttle **leading + trailing** (por defecto `DEFAULT_CURSOR_THROTTLE_MS = 80`) sobre `PresencePort.announce(basePresence.moveCursor(position))`. El borde _leading_ mantiene la sensación inmediata; el _trailing_ garantiza que la posición final se publique aunque el usuario deje de moverse. Los movimientos repetidos en la misma coordenada se descartan y los errores de `announce` se traducen con `toAppError` y se exponen vía `onError`.

4. **Derivación de cursores remotos en Application.** Nuevo `createRemoteCursorsStore` + reductor puro `reduceRemoteCursors` (`src/application/services/remote-cursors-store.ts`), con el mismo patrón que `connected-users-store`: snapshot estable apto para `useSyncExternalStore`, **suscripción perezosa** con el primer subscriber y liberación con el último (una única suscripción al port → sin listeners duplicados). El reductor ignora cambios `origin: 'local'`, el propio `userId`, eventos y presencias de otros workspaces y presencias sin cursor (eliminando el cursor si el usuario lo limpia), elimina al usuario que se va y devuelve orden determinista por `userId`.

5. **UI delgada en Presentación.** `useCursorBroadcast` traduce `pointermove` a coordenadas de mundo (`screenToWorld` sobre el rect del contenedor) y `RemoteCursorsOverlay` dibuja una capa absoluta `pointer-events: none` y `aria-hidden`, posicionando cada cursor con `viewport.worldToScreen`. El `Canvas` recibe `remoteCursors` y `onCursorMove` opcionales y fusiona el ref del hook con el existente; la composición (`App` → `AppRoutes` → `WorkspaceShellPage` → `WorkspaceShellContainer`) crea store y broadcaster y los cablea. La capa de presentación no habla con Firebase.

6. **Lifecycle explícito.** Al desmontar, el contenedor hace `flush()` + `stop()` del broadcaster (publica la última posición y cancela el trailing pendiente); el store libera su suscripción al quedar sin subscribers. No se añaden listeners nuevos al port realtime más allá de la suscripción de presencia compartida.

7. **Fuera de alcance.** Heartbeat/TTL de presencia, interpolación/suavizado de cursores, etiquetas con nombre para mostrar (se usa un sufijo del `userId`) y la limpieza de presencia al desconectar (TASK-085) no forman parte de esta decisión.

## Alternativas consideradas

- **Publicar el cursor en el documento de elementos persistido:** rechazada; viola “la presencia no modifica ni bloquea el documento persistido” y ensuciaría el historial de escritura/versión de elementos.
- **Colección/port separados para cursores:** rechazada; duplica suscripciones y listeners, choca con “no se crean listeners duplicados” y no aporta nada sobre el canal de presencia.
- **Emitir cada `pointermove` sin throttle:** rechazada; saturaría Firestore y provocaría parpadeo/derroche de escrituras.
- **Throttle solo leading o solo trailing:** rechazada; leading puro pierde la posición final, trailing puro añade latencia perceptible.
- **Mover la lógica de throttling a la UI:** rechazada; es coordinación de estado, no presentación, y debe ser testeable sin React ni navegador.
- **CRDT de cursores:** fuera de alcance del MVP por §5.

## Consecuencias

- Los cursores remotos son **efímeros, acotados y desacoplados** de la persistencia; el contrato de `elements` no cambia.
- Existe una política de emisión (throttle leading+trailing) y de consumo (reductor puro) explícita, testeable sin React ni Firebase.
- La serialización sigue siendo compatible con documentos de presencia previos sin cursor.
- Coste: el cursor viaja como campo adicional en el documento de presencia, por lo que cada emisión reescribe ese documento; el throttle mantiene el volumen de escrituras acotado.
- Fuera de alcance y diferido: TTL/heartbeat e interpolación de cursores, y la limpieza de presencia al desconectar (TASK-085).
