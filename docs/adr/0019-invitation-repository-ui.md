# ADR-0019: Invitation repository Firestore, emisión de token e Invitation UI

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

TASK-092 (ADR-0018) dejó el modelo de invitación pendiente, el port `InvitationRepository` y el use case `createInviteMember`, con el contrato materializado por `FakeInvitationRepository`. Para que TASK-093 (Invitation UI) sea usable end-to-end faltaban piezas que el backlog no enumeraba como tareas explícitas:

- El **adapter Firestore** de `InvitationRepository` (el ADR-0018 lo difiere "a la tarea de adapter", que no existe).
- La **composición de `issueToken`** (Web Crypto) y de `generateId`.
- Una **query de Application** para listar invitaciones pendientes.
- El **punto de entrada de UI** (el top bar del workspace es TASK-105, TODO).

Restricciones relevantes:

- El dominio es puro: `crypto`/Web Crypto no puede vivir en Application ni Domain (ADR-0018 §4).
- Los repositorios Firestore siguen ADR-0002/0005 (factory + DI, errores con `AppError`, mapper puro sin import del SDK).
- El accept invitation (TASK-094) necesitará recomputar el hash del token recibido en claro para compararlo con el persistido.
- La UI usa `@raulrod/ui` como base y no habla con Firebase.

## Decisión

1. **Adapter Firestore `createFirebaseInvitationRepository(db)`** en `src/infrastructure/firebase/firebase-invitation-repository.ts`, implementando el contrato de TASK-092:
   - Colección plana `invitations`, **id de documento = `invitation.id`** (a diferencia de membership, la entidad tiene identidad propia).
   - Documento con los campos de la entidad incluido su `id`; `fromInvitationDocument` valida rol y estado con los validators de dominio y lee `Date`/`Timestamp` vía `toDate()` (patrón de membership/workspace).
   - `create` prechequea el id sobre el documento (el `setDoc` de Firestore sobrescribe) y la pendiente duplicada `(workspaceId, email)` vía `listPendingByWorkspace` → `conflict`/`INVITATION_ALREADY_EXISTS`.
   - `listPendingByWorkspace` consulta `(workspaceId == …, status == 'pending')`.
   - `updateStatus` hace `updateDoc` parcial (`status`, `updatedAt`) preservando `createdAt`; sobre inexistente, `notFound`.
   - Errores concretos traducidos con `mapFirebaseError`; invariantes de dominio → `validation`.

2. **Emisión de token en composición (`src/infrastructure/crypto/invitation-token.ts`).** `createInvitationTokenIssuer()` genera 32 bytes con `crypto.getRandomValues`, los codifica en **base64url** (token en claro, url-safe) y deriva `tokenHash` como **SHA-256 en hex** (`crypto.subtle.digest`). `hashInvitationToken(token)` se expone como contrato reutilizable: TASK-094 debe hashear el token del enlace con la misma función para compararlo con el hash persistido. Esto mantiene la criptografía fuera de Application/Domain (ADR-0018 §4) y fuera de la colección en claro.

3. **Query de Application `createListPendingInvitations(invitationRepository)`** en `src/application/queries/list-pending-invitations.ts`. Acepta `workspaceId: string` (patrón `getWorkspace`) y valida el value object en la capa de aplicación; devuelve union `{ status: 'ok'; invitations } | { status: 'error'; error }` con orden determinista `sortPendingInvitations` (createdAt desc, desempate por id). Exportada en `queries/index.ts`.

4. **Composición y wiring.** `src/app/config/invitation-services.ts` compone `inviteMember` (`generateId: () => InvitationId.create(crypto.randomUUID())`, `issueToken`) y `listPendingInvitations`, y se propaga `App.tsx → AppRoutes → WorkspaceShellPage → WorkspaceShellContainer` como props opcionales. El contenedor muestra el botón **Invite** en el header solo si hay servicios de invitación e `localUserId`; el `InviteDialog` vive en el contenedor, fuera del layout puro.

5. **Invitation UI (`src/presentation/features/invitations/`)** con estados explícitos:
   - `InviteMemberForm`: email + rol (`Select`), traduce el resultado `invalid-input` a `FormFieldError` y `error` a mensaje amigable (`describeInviteMemberError`).
   - `InvitationLink`: enlace de un solo uso `INVITATION_ACCEPT_PATH = '/invitations'` + `buildInvitationLink` + botón **Copy link** (clipboard).
   - `PendingInvitationsList`: `loading` (Skeleton), `error` + retry, `empty` y lista con rol y expiración.
   - `InviteDialog`: orquesta (fetch al abrir, refresca tras invitar, revela el enlace una única vez).
   - `invitation-error-messages.ts` con `describeInviteMemberError`/`describePendingInvitationsError` (misma semántica que los demás error messages).

## Alternativas consideradas

- **Diferir el adapter/composición a tareas futuras:** rechazada por el usuario; dejaría TASK-093 sin comportamiento reproducible end-to-end.
- **Doc-id derivado de la pendiente `(workspaceId, email)`:** rechazado; pierde la identidad propia de la entidad (ADR-0018 §2) y no modela re‑invitaciones tras expirar/revocar.
- **Almacenar el token en claro para el accept:** rechazado; rompe ADR-0018 §4.
- **Generar el token con `crypto.randomUUID`:** rechazado; los UUID son débilmente aleatorios como secreto a prueba de fuerza bruta, y no son url-safe sin transformación.
- **Exponer el enlace como ruta configurable:** rechazado; se fija la constante `/invitations` como contrato para TASK-094 y se evita especulación de rutas separadas.

## Consecuencias

- El flujo invitar → ver invitaciones pendientes es real contra Firestore y reproducible en la UI del workspace.
- Quien quiera invitar necesita que las reglas del backend permitan escribir `invitations` (la autorización efectiva sigue siendo responsabilidad de TASK-095/097/rules; la UI solo refleja permisos).
- TASK-094 deberá reutilizar `hashInvitationToken` y la constante `INVITATION_ACCEPT_PATH` para el flujo de accept.
- `listPendingInvitations` y `hashInvitationToken` quedan disponibles como contrato para el resto de tareas dependientes.
- La colección `invitations` requiere un índice/regla solo para las queries usadas (`workspaceId+status`, `tokenHash`) — mismo criterio de autenticación que el resto de consultas del MVP.
