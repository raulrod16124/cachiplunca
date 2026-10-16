# ADR-0020: Accept invitation

**Fecha:** 2026-10-13
**Estado:** Aceptado
**Tarea:** TASK-094 — Accept invitation (`docs/mvp-backlog.md`)

## Contexto

ADR-0018 dejó el modelo de invitación pendiente y el port `InvitationRepository` (`findByTokenHash`, `updateStatus`), y ADR-0019 dejó el adapter Firestore, la emisión de token y `hashInvitationToken(token)` reutilizable, además del enlace `/invitations/:token` como contrato para esta tarea. Faltaba materializar el accept: consumir el token, verificar la invitación y conceder acceso creando la membership.

Restricciones relevantes:

- El dominio es puro: el hashing (Web Crypto) no puede vivir en Domain/Application (ADR-0018 §4); el accept debe recibir `hashToken` inyectado, igual que `issueToken` en el invite.
- La membership sigue el contrato de ADR-0017: `create` duplicado rechaza con `conflict` + `MEMBERSHIP_ALREADY_EXISTS` (sin upsert).
- El invitado puede no tener cuenta; el enlace debe poder abrirse sin sesión y llevar al login/registro conservando el token.
- La autorización efectiva en backend/rules es TASK-097 (TODO); la UI solo refleja permisos.

## Decisión

1. **Caso de uso `acceptInvitation`** en `src/application/commands/accept-invitation.ts`, con deps inyectadas `invitationRepository`, `membershipRepository`, `hashToken` y `now?`. Resultado union consistente: `{ status: 'ok'; workspaceId; role } | { status: 'invalid-input'; fieldErrors } | { status: 'error'; error: AppError }`.

2. **Verificación previa a conceder acceso**, en orden determinista: hash del token → `findByTokenHash`; `null` o no `isPending()` → `INVITATION_INVALID`; `isExpired(now)` → `INVITATION_EXPIRED`; email del usuario distinto al invitado → `INVITATION_EMAIL_MISMATCH` (authorization). La comprobación de email es una frontera de seguridad del lado cliente; la regla efectiva queda para TASK-097.

3. **La membership es la fuente de verdad del acceso.** Se crea con el rol de la invitación (`membershipRepository.create`) y después se marca la invitación `accepted` (`invitationRepository.updateStatus`). Si el `create` falla (p. ej. ya es miembro), se propaga el `AppError` (conflict) sin efectos laterales.

4. **Compensación ante fallo de `updateStatus`.** Si tras crear la membership falla el marcado de la invitación, se borra la membership recién creada (`membershipRepository.delete`) y se devuelve el error original; si el borrado también falla, el error se anota con `details.membershipRollbackFailed: true`. Esto evita dejar acceso concedido con la invitación aún pendiente y es coherente con la compensación de `createWorkspaceWithOwner` (TASK-091).

5. **Nuevos codes aditivos** en `src/shared/errors/app-error.ts`: `INVITATION_INVALID: 'invitation/invalid'` (kind `notFound`), `INVITATION_EXPIRED: 'invitation/expired'` (kind `validation`) e `INVITATION_EMAIL_MISMATCH: 'invitation/email-mismatch'` (kind `authorization`). No se altera ningún code existente; el conflicto de membership reutiliza `MEMBERSHIP_ALREADY_EXISTS`.

6. **Ruta pública `/invitations/:token`.** Se registra fuera de `RequireAuth`/`RequireAnonymous` (el invitado puede no tener cuenta). `AcceptInvitationPage` (Presentation) resuelve por estado de sesión: `loading` → `SessionLoading`; `anonymous` → CTA a `/login?redirect=/invitations/:token` (y registro); `authenticated` → ejecuta el accept una sola vez (guard con `useRef`, seguro ante StrictMode) y muestra `success`/`error` explícitos. La ruta se registra solo si el `acceptInvitation` está inyectado.

7. **Retorno tras autenticarse con `redirect` validado.** `RequireAnonymous` honra `?redirect=` usando `resolveRedirect`, que solo acepta rutas internas (`/` y no `//`) para evitar open redirect. `App.tsx` inyecta `acceptInvitation` desde `invitation-services.ts` (`createFirebaseMembershipRepository` + `hashInvitationToken`).

## Alternativas consideradas

- **Marcar la invitación `accepted` antes de crear la membership:** rechazada; si falla el `create`, se consume la invitación sin conceder acceso (enlace quemado).
- **Swallow del fallo de `updateStatus` y devolver `ok`:** rechazada; dejaría invitaciones pendientes que bloquean re-invitaciones y ocultan un fallo real. Se prefiere compensación explícita.
- **Upsert silencioso de membership:** rechazado; rompe el contrato de ADR-0017 y difumina el conflicto "ya eres miembro".
- **Hashear el token dentro del caso de uso:** rechazado; introduciría Web Crypto en Application (ADR-0018 §4). Se inyecta `hashToken`.
- **Exigir `emailVerified`:** diferido; no hay regla de producto en el MVP y añadiría acoplamiento al proveedor. Se documenta como posible endurecimiento junto a TASK-097.
- **Ruta protegida por `RequireAuth`:** rechazada; el invitado sin cuenta no podría canjear el enlace.

## Consecuencias

- El flujo invitar → aceptar → acceder es reproducible end-to-end y testeable con fakes, sin importar Firebase.
- TASK-096/097 pueden apoyarse en este caso de uso: las rules deben permitir a un usuario autenticado crear su propia membership desde una invitación válida y marcar la invitación como aceptada.
- Los codes nuevos son aditivos; el UI mapea `INVITATION_INVALID`/`INVITATION_EXPIRED`/`INVITATION_EMAIL_MISMATCH`/`MEMBERSHIP_ALREADY_EXISTS` a mensajes amigables.
- Si `updateStatus` falla de forma persistente, el accept devuelve error y no concede acceso (rollback), manteniendo consistencia.
