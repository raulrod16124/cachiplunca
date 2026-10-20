# ADR-0015: Limpieza de presencia al desconectar

**Fecha:** 2026-10-12
**Estado:** Aceptado

## Contexto

TASK-082 introdujo la presencia efímera (`Presence`, `PresencePort` y adapter sobre la colección `presence`), TASK-083 el store de usuarios conectados y TASK-084 los cursores remotos sobre el mismo canal. En ese punto el `PresencePort` ya exponía `withdraw`, implementado en el adapter Firestore (`deleteDoc`) y en el fake, pero **nadie lo invocaba**: la presencia local solo se creaba al mover el cursor y nunca se eliminaba al salir del workspace o al cerrar la pestaña, dejando documentos `presence` huérfanos que ensucian "usuarios conectados".

Restricciones relevantes del MVP:

- La presencia es **estado efímero**: no debe tocar ni bloquear el documento persistido de elementos.
- "Mantener la presencia como estado efímero" y "limpiar presencia al desconectar" son parte del alcance; "no se crean listeners duplicados" sigue siendo criterio de aceptación.
- No hay TTL/heartbeat (diferido en ADR-0014); Firestore no tiene `onDisconnect` como Realtime Database, así que la limpieza es **best-effort** en el cliente.

## Decisión

1. **Un único dueño de la presencia local: `CursorBroadcaster`.** Es ya el servicio de Application que escribe la presencia del usuario (`announce` con throttle). Se le añaden dos métodos sin romper su contrato:
   - `join()`: anuncia la `basePresence` **sin cursor** (upsert idempotente; fire-and-forget con errores traducidos por `toAppError` → `onError`). Da soporte real a "Connected users" (TASK-083) y garantiza que existe un documento que limpiar al salir.
   - `leave()`: cancela el trailing pendiente, resetea `latest`/`lastSent`/`joined` y hace `presencePort.withdraw(workspaceId, userId)` (idempotente; errores por `onError`, nunca lanza). **No** hace flush del cursor final porque el usuario se marcha (la escritura final sería un write-then-delete innecesario y una carrera). No fija `stopped`, de modo que un `move()`/`join()` posterior re-anuncia (vuelta a la pestaña o reconexión de la sesión).

2. **La presencia se une cuando el board está activo.** El `join()` se dispara desde presentación cuando `elementsStatus === 'success'` (board cargado y renderizable), no al resolver el workspace, para que el error del canal de presencia no quede borrado por el reinicio del suscriptor del board.

3. **Limpieza en `unmount` + `pagehide`.** El contenedor (`WorkspaceShellContainer`) ejecuta `leave()` en el cleanup del efecto de presencia (salir del workspace: navegación atrás, logout) y en un listener de `pagehide` añadido con el mismo patrón que el flush de persistencia de TASK-073/075 (cierre/navegación real de la pestaña). **No** se limpia en `visibilitychange` → `hidden` para evitar falsos desconectados al cambiar de pestaña/aplicación (eso sería un mini-heartbeat, fuera de alcance). Si la presencia con `pagehide` queda en bfcache, un `move()` posterior la re-anuncia porque `leave()` no marca `stopped`.

4. **Errores del canal de presencia son errores de colaboración.** Los fallos de `join`/`leave` se entregan por `onError` y se reutiliza el estado `collaborationError` (mismo `kind` `collaboration` y surfacing `role="alert"`), sin abrir un camino de error nuevo.

## Alternativas consideradas

- **Nuevo servicio `PresenceSession` separado del broadcaster:** rechazado; duplicaría la dependencia del `PresencePort` y la `basePresence`, y crearía una carrera entre suscripciones si dos servicios escriben presencia. El broadcaster ya es el "escritor de presencia local".
- **`leave()` como flush + withdraw:** rechazado; el flush final reescribiría el documento para borrarlo a continuación (write-then-delete) y añade una ventana de carrera. Sin flush, el trailing se cancela y el `withdraw` es la única escritura.
- **`leave()` terminal (como `stop()`):** rechazado; un `pagehide` falso (p. ej. bfcache) dejaría al usuario sin re-anunciar en los posteriores `move()`. Mantener el broadcaster "desconectable" permite re-join/re-move sin recrear instancia.
- **Limpiar en `visibilitychange` → `hidden` con re-join en `visible`:** diferido; es un heartbeat rudimentario, fuera del alcance del MVP (ADR-0014).
- **TTL/heartbeat servidor-side:** fuera de alcance del MVP (§5/ADR-0014); la limpieza best-effort del cliente es suficiente para la estrategia de consistencia simple.

## Consecuencias

- La presencia es ahora un ciclo de vida completo y **efímero de verdad**: se une al entrar al board y se retira al salir/cerrar, sin dejar documentos huérfanos en condiciones normales.
- `CursorBroadcaster` pasa de "solo cursor" a "sesión de presencia local" sin cambiar su contrato de throttle ni romper consumidores existentes.
- `PresencePort.withdraw` queda por fin cableado en producción.
- El coste: `join()` añade una escritura por entrada al workspace; `leave()` una por salida; volumen acotado por el ciclo de vida, no por throttling.
- Sigue fuera de alcance el TTL/heartbeat (limpieza si el tab muere sin `pagehide`), la interpolación de cursores y la visibilidad por `visibilitychange`.
