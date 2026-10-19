# ADR-0034: Lecturas acotadas y verificación de email (PBL-001 / TASK-127)

**Fecha:** 2026-10-19
**Estado:** Aceptado
**Tarea:** PBL-001 — Seguridad de lectura y verificación de email (`docs/post-mvp-backlog.md`)

## Contexto

ADR-0023 dejó dos limitaciones MVP explícitas: `workspaces.read` era global para
cualquier autenticado e `invitations.read` también, porque el accept resolvía la
invitación por `tokenHash` sin filtro por membership. ADR-0028 difirió a TASK-127
acotar esas lecturas y exigir `email_verified` en el accept.

El modelo ya contiene todo lo necesario: `memberships/{workspaceId}_{userId}`
identifica al miembro, y cada invitación guarda el email destinatario normalizado.
Firestore rules no puede filtrar resultados de queries, pero sí autoriza una query
si sus constraints garantizan el predicado de la regla.

## Decisión

1. **`workspaces.read` exige membership.** La regla pasa a
   `signedIn() && isMember(workspaceId)`. `ListWorkspaces` sigue funcionando porque
   lista primero las membresías del usuario y después hace `getDoc` de cada
   workspace. Un no miembro deja de poder enumerar ni leer workspaces ajenos.

2. **`invitations.read` se acota a miembros o destinatario.** La regla permite:
   - `isMember(resource.data.workspaceId)` para owners/editors/viewers del
     workspace;
   - `resource.data.email == request.auth.token.email.lower()` para el invitado;
   - `resource == null` para conservar el `getDoc` de comprobación de existencia que
     hace `InvitationRepository.create`.

3. **El lookup por token filtra por email.** `findByTokenHash(tokenHash, email?)`
   añade `where('email', '==', emailNormalizado)` cuando recibe email. Así la query
   cumple el predicado de la regla y el accept por enlace deja de requerir lectura
   global. Un email distinto o vacío no encuentra la invitación (se trata como
   enlace inválido); el camino por `invitationId` conserva el error específico de
   email no coincidente. No se añade ningún índice nuevo: ya existían los campos y
   las consultas son de igualdad simples.

4. **`email_verified` es requisito efectivo del accept.** `isAcceptingValidInvitation`
   (creación de membership) y la rama de accept de `invitations.update` exigen
   `request.auth.token.email_verified == true`. La comprobación también vive en
   Application (`acceptInvitationRecord`) para dar un error explícito y evitar
   llamadas condenadas a fallar.

5. **Flujo de verificación mínimo y sin backend nuevo.**
   - `AuthPort` gana `sendEmailVerification()` y `refreshUser()` (reload +
     `getIdToken(true)`).
   - El registro envía automáticamente el email de verificación y ofrece reenvío.
   - La página de accept refresca el usuario antes de aceptar; si no está
     verificado, muestra un estado con “reenviar” y “ya verifiqué”. El panel de
     invitaciones pendientes refresca antes de aceptar y ofrece las mismas acciones.
   - `getIdToken(true)` es necesario porque rules evalúa el claim cacheado del ID
     token, no el estado local de `User.emailVerified`.

6. **La UI deja de resolver nombres de workspaces ajenos.** El panel de invitaciones
   pendientes mostraba el nombre del workspace llamando a `getWorkspace`. Con la
   lectura acotada eso ya no es legítimo antes de aceptar; se muestra una etiqueta
   i18n genérica hasta que el usuario sea miembro.

7. **Sin dependencias nuevas.** Los tests E2E verifican el email usando los
   endpoints del emulador de Auth (`oobCodes` + `accounts:update` con `oobCode`), no
   con SDKs adicionales.

## Alternativas consideradas

- **Mantener `invitations.read` global y solo exigir email verificado:** rechazado;
  no cierra la enumeración de invitaciones y PII de otros usuarios.
- **Resolver el token por un `getDoc` con id derivado del hash:** rechazado; el id
  de la invitación es independiente del token y no se puede derivar.
- **Añadir `workspaceName` denormalizado a la invitación para mantener el nombre en
  el panel:** rechazado; cambia el modelo y el alcance de PBL-001 sin necesidad.
- **Exigir `email_verified` solo en rules:** rechazado; daría errores genéricos de
  permisos y no guiaría al usuario al flujo de verificación.
- **Usar `firebase-admin` en E2E para marcar usuarios verificados:** rechazado;
  dependencia nueva y privilegios que no representan el flujo real.

## Consecuencias

- Se cierra la enumeración de workspaces e invitaciones para autenticados ajenos.
- El accept por enlace y por lista requieren email verificado en rules y en
  Application; los usuarios nuevos reciben el email al registrarse.
- El panel de pendientes pierde el nombre del workspace hasta aceptar (decisión
  consciente de privacidad).
- Los tests de rules cubren lectura por membership/destinatario, queries por
  workspace/email/token y rechazo de aceptación sin verificar.
- ADR-0023 queda actualizado: sus dos limitaciones MVP sobre lecturas globales ya no
  aplican.
