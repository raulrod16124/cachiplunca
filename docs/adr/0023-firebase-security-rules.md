# ADR-0023: Firebase Security Rules como autorización efectiva

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

ADR-0021 definió la `PERMISSION_MATRIX` (owner/editor/viewer) en Domain como única fuente de verdad, ADR-0022 dejó claro que la UI **solo refleja permisos** y que la autorización efectiva debe existir en backend. Hasta ahora Firestore no tenía Security Rules, por lo que cualquier cliente con un token válido podía leer y escribir cualquier colección.

TASK-097 pide aplicar las reglas para **workspaces, memberships y elementos**, validando identidad y rol, con el criterio explícito de que "un Viewer no puede escribir manipulando el cliente". Además se amplía a las colecciones introducidas después por el backlog (`invitations` TASK-092/093, `presence` TASK-075/077) para no dejar huecos de autorización en el MVP.

## Decisión

1. **Las reglas viven en `firestore.rules` (raíz) y replican la matriz de ADR-0021**, traducida a roles y operaciones por recurso. El rol del usuario en un workspace se deriva de `memberships/{workspaceId}_{userId}` (mismo doc-id que el adapter de TASK-090). Helpers: `signedIn()`, `membershipId()`, `membershipPath()`, `isMember()`, `roleOf()`, `hasRole()`.

2. **`hasRole(workspaceId, roles)` es el único evaluador de permisos** (equivalente backend de `can(role, operation)`), compuesto por `isMember()` + `roleOf()` y guardando con `in roles`. Cualquier regla de escritura pasa por él; no se duplica lógica de roles.

3. **Matriz aplicada por recurso:**

   - `workspaces`: `read` y `create` para cualquier autenticado; `update`/`delete` solo owner.
   - `memberships`: `read` para el propio usuario, miembros del workspace, o un `get` de documento inexistente (`resource == null`) para conservar el contrato null de `findByUserAndWorkspace`; `create` para el propio usuario (self-join) u owner; `update` (cambio de rol) exclusivo de owner sin poder mutar `userId`/`workspaceId` (identidad inmutable); `delete` del propio usuario (leave) u owner (remove).
   - `elements`: `read` para miembros; `create`/`update`/`delete` solo owner/editor; `create` exige `createdBy == request.auth.uid` (no se puede suplantar el autor) y `update` no permite cambiar `workspaceId` (aislamiento por workspace, ADR-0010).
   - `invitations`: `read` para cualquier autenticado (necesario para el lookup por `tokenHash` del accept, ver limitaciones); `create` owner/editor con `invitedBy == request.auth.uid`; `update` owner/editor, o el propio invitado cuando su email coincide, la invitación está `pending`, se pasa a `accepted` y solo cambian `status`/`updatedAt` (`diff().affectedKeys().hasOnly(...)`).
   - `presence`: `read` para miembros; `create`/`update`/`delete` solo del dueño del documento (`userId == auth.uid`) siendo miembro.

4. **Test harness con emulador y tests baseline (harness + casos base), suite exhaustiva en TASK-098.** `@firebase/rules-unit-testing@5` + `firebase-tools` como devDeps; configuración de emulador Firestore en `firebase.json` (puerto 8080, `singleProjectMode`); nuevo proyecto Jest dedicado (`jest.rules.config.cjs`, `testEnvironment: node`, raíz `src/test/rules`) con script `npm run test:rules` (`firebase emulators:exec --only firestore --project demo-cachiplunca "jest --config jest.rules.config.cjs"`). El jest principal ignora `src/test/rules` vía `testPathIgnorePatterns` para que `npm test` no requiera emulador. `storage.rules` queda fuera de alcance (Storage no se usa en el MVP).

5. **`firebase-tools` se pincha en `^14`** (Java 11+): la v15 exige JDK ≥21 y el entorno de desarrollo usa Java 17. Documenta la compatibilidad con el toolchain local.

## Limitaciones asumidas (MVP deliberado)

- **`workspaces.read` es global para autenticados**: `ListWorkspaces` (TASK-055) lee el catálogo completo sin filtro por membership, y las rules no pueden filtrar por rol en un query sin datos suficientes. En el MVP leer la lista de workspaces no filtra contenido sensible; el acceso de escritura sí está acotado por rol.
- **`memberships.create` admite self-join**: el gating real de aceptar una invitación vive en Application (`accept-invitation`, TASK-094), que verifica email/token/estado antes de crear la membership. Las rules no pueden consultar a `invitations` para reintegrar esa lógica, así que un cliente lo suficientemente sofisticado podría auto-unirse a un workspace que conoce su id. Es una limitación aceptada del MVP (sin backend), documentada para revisión futura.
- **`invitations.read` es global para autenticados**: el accept resuelve la invitación por `tokenHash` y las rules no hacen queries; exponer la lista de invitaciones pendientes a todos los autenticados es el precio del lookup. El `create`/`update` sí está acotado por rol o por email del invitado.

## Alternativas consideradas

- **Solo compartir reglas entre funcion y usar `resource.data.role` embebido en documentos:** rechazada; el rol vive en `memberships` (TASK-090), no por documento, y poco a poco se consolidaría la fuente de autorización fuera de ADR-0021.
- **Duplicar la matriz en otro idioma (gates del cliente como autorización):** rechazada por ADR-0022; la UI solo refleja permisos y las rules son la frontera efectiva.
- **Subcolección `workspaces/{id}/members` en vez de colección top-level:** rechazada; el port de TASK-089 y el adapter de TASK-090 ya operan sobre `memberships` top-level con doc-id compuesto.
- **Exigir JDK 21 (actualizar `firebase-tools` a v15):** rechazada; rompería el entorno local (Java 17). Se pincha v14 y se anota la deuda de actualización.
- **Testear exhaustivamente en esta tarea:** el alcance aprobado es harness + casos baseline; la batería completa queda para TASK-098.

## Consecuencias

- Los criterios de TASK-097 se cumplen y se verifican: viewer bloqueado en escritura (denied con cliente manipulado), allow/deny testeados (24 casos), sin regresiones, quality gates en verde.
- TASK-098 (Security Rules tests) ampliará la cobertura sobre el mismo harness sin cambiar las reglas salvo defecto revelado.
- Los tests de reglas son la base de regresión de la frontera de seguridad: cualquier cambio de `PERMISSION_MATRIX` exigirá revisar `firestore.rules` (la matriz sigue siendo la fuente única de verdad en Domain).
- Mantener la paridad reglas ↔ matriz es manual (no hay import de TS a rules); se mitiga con el harness y revisión en cada cambio de permisos.

## Actualización (2026-10-19) — PBL-001 / ADR-0034

Las dos limitaciones de lectura del MVP quedan cerradas:

- `workspaces.read` ya no es global: exige `isMember(workspaceId)`.
- `invitations.read` se limita a miembros del workspace o al destinatario cuyo email
  coincide. El lookup por `tokenHash` filtra por email (`findByTokenHash(tokenHash,
email)`) para que la query sea autorizable.
- El accept exige `request.auth.token.email_verified == true` en rules, con flujo de
  verificación en la aplicación.

Ver `docs/adr/0034-scoped-reads-email-verification.md`.
