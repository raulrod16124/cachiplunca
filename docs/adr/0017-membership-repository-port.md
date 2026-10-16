# ADR-0017: Puerto de persistencia de Membership

**Fecha:** 2026-10-13
**Estado:** Aceptado
**Tarea:** TASK-089 — Membership repository port (`docs/mvp-backlog.md`)

## Contexto

TASK-016 dejó la entidad `Membership` (`userId`, `workspaceId`, `role`, timestamps) y ADR-0005 fijó el patrón de repositorios: el port vive en `src/application/ports`, opera con tipos de dominio y rechaza con `AppError` (no con `Result`). Las tareas dependientes necesitan un contrato de persistencia antes de escribir adapters o casos de uso:

- TASK-091 (create owner membership) y TASK-092 (invite member) crean memberships.
- TASK-095 (authorization policy) resuelve el rol de un usuario en un workspace.
- TASK-099/TASK-100 (change role / remove member) y TASK-101 (leave workspace) mutan o eliminan memberships.
- TASK-090 implementará el adapter Firestore.

`Membership` **no tiene id propio**: se identifica por la clave compuesta `(userId, workspaceId)`. A diferencia de `Workspace` (ADR-0005), el adapter no genera id.

## Decisión

1. **`MembershipRepository` vive en `src/application/ports/membership-repository.ts`** y opera con tipos de dominio: recibe `UserId`/`WorkspaceId` y devuelve entidades `Membership` (nunca documentos planos ni strings crudos). El mapeo persistencia↔dominio es responsabilidad del adapter (TASK-090). Exportado desde `src/application/ports/index.ts`.

2. **Identidad por clave compuesta, sin id generado.** Todas las operaciones reciben `userId` y `workspaceId`; no se introduce un `MembershipId` especulativo. Esto refleja la invariante de dominio de `Membership` y evita una fuente de identidad paralela.

3. **Superficie de operaciones:** `create(input)`, `findByUserAndWorkspace(userId, workspaceId)`, `listByWorkspace(workspaceId)`, `listByUser(userId)`, `updateRole(userId, workspaceId, role)` y `delete(userId, workspaceId)`. Incluye `listByUser` porque TASK-020 (listar workspaces de un usuario) y las tareas de autorización lo requieren; se documenta como decisión explícita, no especulativa. El orden de las listas no forma parte del contrato.

4. **`findByUserAndWorkspace` devuelve `Membership | null`** (ausencia como valor, no como error). `updateRole`/`delete` sobre una membership inexistente rechazan con `notFound` + `NOT_FOUND_RESOURCE`.

5. **`create` duplicado rechaza con `conflict`.** Se añade a `ERROR_CODES` el code `MEMBERSHIP_ALREADY_EXISTS: 'membership/already-exists'` (kind `conflict`). Crear una membership ya existente es un error predecible de negocio, no un upsert silencioso: hace visibles los duplicados en invite/create-owner. `updateRole` no cambia la identidad, por lo que nunca produce conflicto.

6. **Errores de invariantes → `validation`.** El adapter y el fake construyen con `Membership.create`/`updateRole` y traducen los `Error` crudos del dominio (rol inválido, timestamps inválidos) a `AppError` de kind `validation` + `VALIDATION_INVALID_INPUT`; nunca propagan el error crudo.

7. **`FakeMembershipRepository` en `src/test/fixtures/fake-membership-repository.ts` materializa el contrato** antes de que exista el adapter: `Map` con clave `"<userId>:<workspaceId>"`, construcción vía la entidad real y traducción de errores idéntica a la del adapter. Su test de contrato (`src/test/unit/application/ports/fake-membership-repository.test.ts` + `src/test/contract/membership-repository-contract.ts`) es la especificación ejecutable que TASK-090 deberá cumplir.

## Alternativas consideradas

- **`MembershipId` propio:** rechazada; la entidad no lo tiene y la clave compuesta ya identifica de forma única.
- **`create` idempotente (upsert):** rechazada; oculta duplicados y dificulta distinguir "invitar" de "ya es miembro". Se prefiere un `conflict` explícito.
- **Añadir `listByUser` después:** rechazada; el usuario confirmó incluirla ahora por necesidades inmediatas de TASK-020/autorización, y ampliar el port después sería aditivo pero innecesariamente tardío.
- **Devolver documentos Firestore o `Result` unions:** rechazada; rompe el patrón de ADR-0005 (ports devuelven entidades de dominio y rechazan con `AppError`).

## Consecuencias

- TASK-090-TASK-092 y TASK-095-TASK-101 pueden implementarse y testearse con el fake, sin importar Firebase.
- El adapter de TASK-090 solo debe cumplir el contrato + traducir errores; cualquier divergencia la detectarán los tests de contrato reutilizables.
- La autorización efectiva sigue residiendo en Security Rules (TASK-097); el port solo persiste y expone roles.
- El nuevo code `MEMBERSHIP_ALREADY_EXISTS` es aditivo y no altera los codes existentes.
