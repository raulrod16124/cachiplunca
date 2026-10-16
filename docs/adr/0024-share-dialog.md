# ADR-0024: Share dialog (invitaciones y gestión de miembros)

**Fecha:** 2026-10-14
**Estado:** Aceptado
**Tarea:** TASK-107 — Share dialog (`docs/mvp-backlog.md`)

## Contexto

TASK-093 (ADR-0019) entregó el flujo de invitación con `InviteDialog`, y TASK-099/100/101 dejaron listos los use cases de Application `changeMemberRole`, `removeMember` y `leaveWorkspace` **sin cableado a UI**, a la espera del Share dialog. TASK-105 (ADR-0019 §4/§5) expuso en el top bar el botón `Invite` como acción provisional de "compartir", sin introducir UI muerta.

TASK-107 debe cerrar el hueco: una única superficie para **invitar** y **gestionar quién tiene acceso** (cambiar rol, eliminar, salir), reflejando con `can(...)` la política de ADR-0021 y apoyándose en las Security Rules (ADR-0023) como frontera real. Restricciones:

- La UI concentra React/`@raulrod/ui`; no habla con Firebase.
- Application expone el listado de miembros (no existía query) además de los comandos ya existentes.
- `Membership` solo tiene `userId`, `workspaceId`, `role`, `createdAt`, `updatedAt`; no hay directorio de usuarios (email/displayName) ni backend de directorio.

## Decisión

1. **Query de Application `createListWorkspaceMembers(membershipRepository)`** (`src/application/queries/list-workspace-members.ts`). Acepta `workspaceId: string` (patrón `getWorkspace`/`listPendingInvitations`) y devuelve union `{ status: 'ok'; members } | { status: 'error'; error }` con orden determinista `sortWorkspaceMembers` (**precedencia de rol owner → editor → viewer, desempate por `userId` asc**). Exportada en `queries/index.ts` y compuesta en `workspace-services.ts` (con el `createFirebaseMembershipRepository` ya existente).

2. **`InviteDialog` se degrada a `InvitePanel`** (`src/presentation/features/invitations/components/invite-panel.tsx`), sin wrapper de `Dialog`: recibe `active` y hace el fetch/refresh/invitación cuando está activo. El Share dialog lo embebe dentro de una pestaña, de modo que la lógica de invitación es reutilizable y no duplica fetch ni refresco.

3. **Nueva feature de Presentation `sharing`** (`src/presentation/features/sharing/`):
   - `ShareDialog` (`components/share-dialog.tsx`): orquesta `Dialog` + `Tabs` ("Invite" y "People"). Carga los miembros al abrir, refresca la lista tras cambiar rol/eliminar y navega fuera tras salir (`onLeft`). Estados explícitos de **loading / error + retry / empty**.
   - `MembersList` (`components/members-list.tsx`): presentacional. Muestra `Avatar` + **identidad = `userId` truncado (últimos 8 caracteres)** — mismo criterio que la presencia del top bar, sin directorio de usuarios. El miembro actual se marca "You"; a los demás se les ofrece `Select` de rol (si `member:update-role`) y botón Remove (si `member:remove`); el propio ofrece Leave (si `member:leave`).
   - `share-error-messages.ts`: `describeListMembersError`/`describeChangeMemberRoleError`/`describeRemoveMemberError`/`describeLeaveWorkspaceError`, misma semántica que el resto de `*-error-messages`.

4. **Gating en el contenedor.** El botón del top bar pasa de `Invite` a **`Share`** (`onInvite` → `onShare` en `workspace-top-bar`/`workspace-shell-layout`) y se muestra a **todos los miembros** (un viewer puede ver miembros y salir), no solo a quien puede invitar. `canShare = localUserId && listWorkspaceMembers && leaveWorkspace && (!permissionsEnforced || role !== undefined)`: si el rol no está resuelto y los guards están cableados, no hay entrada (deny). Las capacidades dentro del diálogo se derivan de `can('member:invite' | 'member:update-role' | 'member:remove' | 'member:leave')`; la pestaña Invite solo aparece con permiso y servicios de invitación.

5. **Composición y wiring.** `workspace-services.ts` añade `listWorkspaceMembers`; `App.tsx → AppRoutes → WorkspaceShellPage → WorkspaceShellContainer` propagan como props opcionales `listWorkspaceMembers`, `changeMemberRole`, `removeMember`, `leaveWorkspace` (junto a `inviteMember`/`listPendingInvitations` ya existentes). El `ShareDialog` vive en el contenedor, fuera del layout puro; los tests previos sin servicios siguen funcionando (no hay botón Share).

## Alternativas consideradas

- **Mantener `InviteDialog` y añadir un `MembersDialog` separado:** rechazada; dos puntos de entrada compiten por la misma intención ("compartir acceso") y duplican estado/errores. El backlog pide un único Share dialog.
- **Listar miembros desde el contenedor y pasar la lista al diálogo:** rechazada; el diálogo necesita refrescar tras cada mutación; centralizar el fetch en el diálogo mantiene el contenedor más simple, igual que `InvitePanel`.
- **Resolver el rol de cada fila con una query por miembro / directorio de usuarios:** rechazada; no hay directorio ni backend, y multiplicaría consultas. La identidad por `userId` truncado es suficiente y consistente con la presencia.
- **Permitir cambiar el rol o eliminar al propio usuario desde la lista:** rechazada; las acciones sobre uno mismo se canalizan por "Leave workspace", evitando un workspace sin owner accidental (el backlog no define invariante de último owner).
- **Mostrar el botón Share solo a owner/editor:** rechazada; el scope acordado da a los viewers acceso de lectura a los miembros y la posibilidad de salir.

## Consecuencias

- El flujo invitar + gestionar miembros es real y reproducible end-to-end contra Firestore; `changeMemberRole`/`removeMember`/`leaveWorkspace` dejan de ser contratos muertos.
- La autorización efectiva sigue en Firebase Security Rules (ADR-0023); la UI es defensa en profundidad y UX.
- `Hash`/lint/format/tsc/build en verde; tests nuevos `list-workspace-members.test.ts`, `members-list.test.tsx`, `share-dialog.test.tsx`, `share-error-messages.test.ts` y `invite-panel.test.tsx` (sustituye a `invite-dialog.test.tsx`), actualizando `workspace-top-bar.test.tsx` y `workspace-shell-container.test.tsx`.
- Sin invariante de "último owner": se mantiene la decisión de TASK-099/100/101 y se revisará en TASK-102/auditoría.
