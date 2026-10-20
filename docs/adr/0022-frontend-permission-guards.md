# ADR-0022: Guards de permisos en el frontend

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

ADR-0021 dejó la política de autorización como lógica pura de Domain (`can(role, operation)`, `PERMISSION_MATRIX`), pero deliberadamente no resolvió "cómo obtiene la UI el rol del usuario" ni "dónde se reflejan los permisos". TASK-096 debe cerrar ese hueco para que la interfaz deje de permitir acciones que la política prohíbe (por ejemplo, que un viewer borre elementos o que un viewer vea invitar a miembros), mientras la autorización efectiva sigue viviendo en Firebase Security Rules (TASK-097).

El workspace ya conoce `localUserId` (id del usuario autenticado) y existe `MembershipRepository.findByUserAndWorkspace(userId, workspaceId)`, que devuelve la `Membership` o `null`.

## Decisión

1. **Resolver el rol es un caso de uso de Application, no de Presentation.** Nuevo `createGetWorkspaceRole(membershipRepository)` (`src/application/queries/get-workspace-role.ts`) que devuelve una union explícita `ok` (con `role`) `| notFound | error` (con `AppError` normalizado por `toAppError`). Presentación no toca el repositorio ni conoce Firestore.

2. **La UI consume la política, no la reimplementa.** Nuevo hook `useWorkspacePermissions(role)` (`src/presentation/hooks/use-workspace-permissions.ts`) que expone `{ role, can(operation) }` delegando en el `can(role, operation)` de Domain. `role` ausente ⇒ `can(...)` siempre `false` (deny por defecto).

3. **Guardado por permisos en el borde de la UI:**
   - El rol se resuelve en `WorkspaceShellContainer` cuando `getWorkspaceRole` y `localUserId` están presentes; mientras carga, la pantalla mantiene el estado de carga para evitar un flash de capacidades incorrectas.
   - El botón **Invite** solo se monta si `can('member:invite')` y los servicios de invitación están cableados.
   - El `Canvas` recibe `readOnly` cuando `!can('element:write')`; en modo lectura desactiva los hooks de edición (mover, redimensionar, borrar, duplicar, copiar/pegar, deshacer/rehacer) y expone `aria-readonly`. Pan, zoom, selección y presencia siguen disponibles.

4. **Compatibilidad de composición: si `getWorkspaceRole` no está cableado, los guards no se aplican.** Es una prop opcional (mismo patrón que los servicios de invitación), de modo que composiciones y tests previos a la existencia de permisos siguen funcionando. En producción `workspace-services.ts` siempre construye `getWorkspaceRole` (`createFirebaseMembershipRepository`), por lo que los guards están activos. Cuando el servicio está cableado y el rol es desconocido (`notFound`, error o `localUserId` ausente), se cae a **deny** (read-only, sin invitar).

5. **El frontend solo refleja permisos.** La decisión recuerda explícitamente (constraints de TASK-096/097) que la autorización efectiva se implementa/verifica en Firebase Security Rules; la UI es defensa en profundidad y UX, no una frontera de seguridad.

## Alternativas consideradas

- **Resolver el rol dentro de `Presentation`** (llamar al repositorio desde el container): rechazada; acopla la UI a infraestructura y salta la frontera de Application.
- **Reimplementar la matriz en el container/hook:** rechazada; duplica la fuente única de verdad de ADR-0021.
- **Fail-closed cuando la query no está cableada:** rechazada por pragmatismo; rompería composiciones/tests previos al rol y no aporta seguridad real (la seguridad está en las rules). El deny se aplica cuando el servicio sí está cableado.
- **Bloquear la pantalla entera para viewers:** rechazada; un viewer es un usuario legítimo de solo lectura, debe ver el tablero (pan/zoom/selección) sin escribir.

## Consecuencias

- TASK-097 consumirá la misma `PERMISSION_MATRIX` para escribir Security Rules, cerrando la brecha real de autorización.
- Tests nuevos: `get-workspace-role.test.ts` (ok/notFound/error/id inválido) y `use-workspace-permissions.test.tsx` (owner/editor/viewer/undefined); `workspace-shell-container.test.tsx` amplía con viewer sin Invite, editor con Invite, canvas read-only para viewer y rol desconocido.
- Si en el futuro se necesita una política por recurso u overrides, `useWorkspacePermissions` y `can(...)` son el punto de extensión sin tocar el resto de la UI.
