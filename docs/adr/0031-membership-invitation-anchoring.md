# ADR-0031: Anclar membership a invitación válida y acotar rol otorgable (TASK-126)

**Fecha:** 2026-10-15
**Estado:** Aceptado

## Contexto

El audit de seguridad (ADR-0028) identificó dos vulnerabilidades críticas en la
frontera de autorización:

- **F1 (Critical):** `memberships.create` permitía self-join con rol arbitrario.
  Cualquier usuario autenticado podía crear `memberships/{ws}_{uid}` con
  `role: 'owner'` y tomar control de cualquier workspace.
- **F1a (High):** un editor podía crear una invitación con `role: 'owner'` y
  luego auto-asignarse ese rol explotando F1.

La única creación legítima de membership debe provenir de:

1. El creador de un workspace, que adquiere automáticamente el rol `owner`.
2. Un usuario que acepta una invitación pendiente, con el rol exacto de esa
   invitación.

## Decisión

1. **El workspace registra a su creador.** `Workspace` ahora incluye `createdBy: UserId`.
   Esto permite distinguir, en reglas y lógica de dominio, al usuario que creó el
   workspace del resto de miembros. `WorkspaceRepository.create` exige `createdBy`.

2. **La membership puede llevar `invitationId`.** `MembershipCreateInput` acepta un
   `invitationId` opcional. `accept-invitation` lo propaga para que las reglas de
   seguridad puedan validar la invitación. Las memberships creadas por el flujo de
   owner (workspace creator) no llevan `invitationId`.

3. **Dominio define quién puede otorgar qué rol.** `authorization-policy.ts` añade
   `GRANTABLE_ROLES` y `canGrantRole(actorRole, grantedRole)`:

   - `owner` puede otorgar `owner`, `editor` y `viewer`.
   - `editor` puede otorgar `editor` y `viewer`.
   - `viewer` no puede invitar.

4. **`invite-member` valida tanto membresía como permiso de rol.** El comando consulta
   el repositorio de memberships del actor y rechaza la invitación si intenta
   otorgar un rol que su rol actual no permite.

5. **`firestore.rules` es la frontera efectiva.**

   - `workspaces.create` exige `createdBy == request.auth.uid`.
   - `memberships.create` solo permite:
     - Creador del workspace creándose a sí mismo como `owner`.
     - Aceptación de invitación válida: `invitationId` referencia una invitación
       `pending` cuyo `workspaceId`, `email` y `role` coinciden con la membership.
   - `invitations.create` acota el rol según el rol del actor (`canGrantRoleInInvitation`).

6. **Tests de reglas refuerzan el cierre.** Se añaden/ajustan tests que demuestran:
   - self-create sin invitación válida es denegado;
   - creador puede crearse como owner;
   - aceptación con invitación válida funciona;
   - aceptación falla si cambian email, rol, estado o expiración;
   - un owner no puede añadir directamente un miembro (debe usar invitación);
   - editor no puede invitar con rol owner.

## Alternativas consideradas

- **Confiar solo en `userId == request.auth.uid` en `memberships.create`:** descartado;
  era precisamente la vulnerabilidad F1.
- **Anclar membership al creador del workspace sin `createdBy`:** descartado; no hay
  forma segura de saber quién creó el workspace sin persistir el dato, y depender de
  un campo mutable o de una membership previa sería circular.
- **Usar `tokenHash` en lugar de `invitationId` en la membership:** descartado; el
  `tokenHash` se usa para buscar la invitación desde el cliente, pero el documento de
  invitación ya tiene un `id` estable. Usar `invitationId` simplifica las reglas y el
  mapeo.
- **Permitir que owner cree memberships directamente para otros:** descartado; rompe
  el principio de que toda incorporación pasa por una invitación trazable y deja un
  vector para errores/abuso.
- **Mover la validación de rol otorgable solo a las reglas:** descartado; las reglas
  ya lo validan, pero duplicar la validación en Application mejora la defensa en
  profundidad y permite mensajes de error específicos antes de tocar Firestore.

## Consecuencias

- El modelo de `Workspace` cambia: todos los puntos que crean workspaces deben
  proporcionar `createdBy`.
- `MembershipCreateInput` incluye un campo opcional que solo se usa en el flujo de
  aceptación.
- Las reglas de seguridad son más estrictas: ya no se puede elevar privilegios sin
  una invitación explícita y válida.
- El flujo de invitación/aceptación es el único camino para nuevos miembros fuera
  del creador del workspace.
- TASK-124 (validación final del MVP) puede proseguir con la frontera de seguridad
  cerrada.
