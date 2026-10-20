# ADR-0018: Modelo de invitación pendiente

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

ADR-0017 dejó el `MembershipRepository`, pero invitar a un colaborador no equivale a crear una membership: el invitado puede no tener cuenta todavía ni haber consentido. TASK-092 debe permitir invitar por email sin crear acceso inmediato.

Restricciones relevantes:

- El dominio es puro: no puede depender de React, Firebase, `styled-components`, UI ni APIs del navegador (`crypto`, `window`).
- Los ports viven en `src/application` y rechazan con `AppError` (ADR-0001/0005).
- TASK-093 (UI de invitaciones) y TASK-094 (accept invitation) son tareas dependientes; el adapter Firestore llega después (mismo patrón que TASK-089 → TASK-090).
- La autorización del invitador (rol owner/editor) es responsabilidad de TASK-095/TASK-097 y se difiere.

## Decisión

1. **Entidad `Invitation` separada de `Membership`** en `src/domain/invitation/`. Una invitación es un recurso propio con ciclo de vida (`pending → accepted | revoked`) y expiración; la membership solo se crea al aceptar (TASK-094). Modelar la invitación como membership "pendiente" mezclaría dos responsabilidades.

2. **`Invitation` tiene id propio (`InvitationId`).** A diferencia de `Membership` (clave compuesta), una invitación necesita identidad estable para listar, revocar y actualizar estado. `InvitationId` es un value object en `src/domain/shared/value-objects/invitation-id.ts`.

3. **El email es la identidad funcional de la invitación pendiente.** El dominio normaliza el email (`trim` + `toLowerCase`) y valida su formato con una regex privada; el dominio no importa `src/shared`. Se admiten varias invitaciones para el mismo email en workspaces distintos.

4. **El token se persiste hasheado; el token en claro se devuelve una sola vez.** El caso de uso genera el token mediante una dependencia inyectada `issueToken(): Promise<{ token; tokenHash }>`, de modo que la criptografía (Web Crypto, aleatoriedad) vive en composición y no en la capa de aplicación. El use case solo persiste `tokenHash` y devuelve `token` al llamador para construir el enlace. Esto limita el daño si se filtra la colección.

5. **`InvitationStatus` = `'pending' | 'accepted' | 'revoked'`** más expiración derivada (`expiresAt`). `expiresAt` se calcula en el use case con TTL por defecto (`INVITATION_TTL_MS`, 7 días) y reloj inyectable. La expiración no es un estado almacenado: `isExpired(now)` la deriva.

6. **Puerto `InvitationRepository`** en `src/application/ports/invitation-repository.ts`:
   - `create(invitation)` — persiste la entidad ya construida (el use case genera id y token).
   - `findByTokenHash(tokenHash)` — resolución del accept (TASK-094).
   - `listPendingByWorkspace(workspaceId)` — UI de invitaciones pendientes (TASK-093).
   - `updateStatus(id, status)` — accept/revoke (TASK-093/094).
     `create` rechaza con `conflict` + `INVITATION_ALREADY_EXISTS` si ya existe una invitación **pendiente** para `(workspaceId, email)`, o si el id ya existe. `updateStatus` sobre inexistente rechaza con `notFound`. Se documenta la inclusión de las operaciones de TASK-093/094 como contrato anticipado, igual que ADR-0017, no como especulación.

7. **Caso de uso `inviteMember`** en `src/application/commands/invite-member.ts`. Resultado union consistente con el resto:
   - `{ status: 'ok'; invitation; token }`
   - `{ status: 'invalid-input'; fieldErrors: { email?; role? } }`
   - `{ status: 'error'; error: AppError }`
     Dependencias inyectadas: `invitationRepository`, `generateId`, `issueToken`, `now?`, `ttlMs?`. La validación de entrada (email/rol) ocurre antes de tocar el repositorio; los errores de invariantes de dominio se traducen a `validation`, y los errores del repositorio con `toAppError` (preserva conflict/network y normaliza inesperados a `unknown`).

8. **Nuevo code `INVITATION_ALREADY_EXISTS: 'invitation/already-exists'`** (kind `conflict`), aditivo, análogo a `MEMBERSHIP_ALREADY_EXISTS`.

9. **`FakeInvitationRepository` en `src/test/fixtures/fake-invitation-repository.ts`** materializa el contrato antes del adapter. Su contrato ejecutable (`src/test/contract/invitation-repository-contract.ts`) es la especificación que el futuro adapter Firestore deberá cumplir.

## Alternativas consideradas

- **Crear la membership directamente al invitar (sin invitación pendiente):** rechazada; daría acceso a un email no verificado y sin consentimiento, y no permite revocar ni expirar.
- **Reutilizar `Membership` con un flag `pending`:** rechazada; contamina la entidad y su clave `(userId, workspaceId)` no aplica cuando el invitado aún no tiene `userId`.
- **Persistir el token en claro:** rechazada; el hash reduce el impacto de una filtración de la colección.
- **Hashear en el caso de uso / en el dominio:** rechazada; introduciría Web Crypto o dependencias de plataforma en capas puras. Se inyecta `issueToken` (patrón `generateId`/`now`).
- **Añadir `InvitationId` "por simetría" a Membership:** ya rechazado en ADR-0017; aquí sí procede porque la invitación tiene identidad y ciclo de vida propios.
- **Restringir el rol invitado a editor/viewer:** rechazada por ahora; el dominio admite múltiples owners y no hay regla de producto que lo prohíba. La autorización del invitador se difiere a TASK-095/097.

## Consecuencias

- TASK-093/094 pueden implementarse y testearse con el fake, sin importar Firebase.
- El dominio de invitaciones queda sin dependencias de React/Firebase/UI/DOM y cubierto por tests unitarios de invariantes.
- El token en claro nunca se persiste desde el código de aplicación; el adapter solo almacena `tokenHash`.
- La expiración no requiere job: se evalúa al leer/aceptar; un job de limpieza queda fuera del MVP.
- `INVITATION_ALREADY_EXISTS` es aditivo y no altera codes existentes.
