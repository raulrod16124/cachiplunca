# ADR-0005: Puerto de persistencia de Workspace

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-017 — Workspace repository port (`docs/mvp-backlog.md`)

## Contexto

TASK-015 dejó la entidad `Workspace` (con `WorkspaceId`) y ADR-0001/ADR-0002 fijan `AppError` como modelo de errores común y el patrón de ports. TASK-019-TASK-022 (casos de uso CRUD) y TASK-018 (adapter Firestore) dependen de un contrato de persistencia que aún no existía. El alcance de TASK-017 es únicamente definir el port: "contratos para crear, listar, actualizar y eliminar" y su modelo de errores/resultados, testeable con un fake.

## Decisión

1. **`WorkspaceRepository` vive en `src/application/ports/workspace-repository.ts`** y opera con tipos de dominio: recibe `WorkspaceId` y devuelve entidades `Workspace` (nunca documentos planos ni strings crudos de id). El mapeo persistencia↔dominio es responsabilidad del adapter (TASK-018).

2. **Contrato CRUD mínimo + lectura puntual:** `create(input)`, `list()`, `findById(id)`, `update(id, updates)` y `delete(id)`. `findById` devuelve `Workspace | null` (ausencia como valor, no como error); `update`/`delete` sobre un id inexistente rechazan con `notFound`. El orden de `list()` no forma parte del contrato: lo define el caso de uso (TASK-020).

3. **Los métodos rechazan con `AppError`, no con `Result` unions** (simétrico con `AuthPort`, ADR-0002 punto 2). Los casos de uso capturan con `toAppError` y lo mapean a sus resultados discriminados. Semántica de rechazo: `validation` + `VALIDATION_INVALID_INPUT` cuando la entidad no puede construirse/actualizarse (invariantes de dominio), `notFound` + `NOT_FOUND_RESOURCE` para ids inexistentes, `persistence`/`network` para fallos de storage. `findById` nunca rechaza por ausencia.

4. **El id lo genera el adapter, no el caso de uso.** `create` recibe un `WorkspaceCreateInput` (`name`, `description?`) y devuelve la entidad persistida con id y timestamps ya asignados (en Firestore: auto-id de documento). Consecuencias: no hay riesgo de conflicto de id (no se añadió código de conflicto a `ERROR_CODES`), Infrastructure solo decide id/timestamps de creación, y las invariantes de contenido siguen en `Workspace.create`/`Workspace.update`. El adapter traduce los `Error` crudos del dominio a `AppError` de kind `validation` (nunca los propaga crudos).

5. **`list()` no filtra por usuario.** `Workspace` (TASK-015, DONE) no tiene `ownerId` y el membership repository llega en TASK-089; filtrar ahora obligaría a reabrir la entidad o a introducir acoplamientos prematuros. Ampliar el port después (p. ej. `listByMember`) es aditivo y no rompe el contrato. La autorización efectiva residirá en Security Rules (TASK-097).

6. **`FakeWorkspaceRepository` en `src/test/fixtures/fake-workspace-repository.ts` materializa el contrato** antes de que exista el adapter: `Map` en memoria, ids secuenciales `ws-<n>`, construcción vía `Workspace.create`/`Workspace.update` (replica los invariantes reales) y traducción de errores idéntica a la que hará el adapter. Sus tests de contrato (`src/test/unit/application/ports/fake-workspace-repository.test.ts`) son la especificación ejecutable que TASK-018 deberá cumplir.

## Consecuencias

- TASK-019-TASK-022 pueden implementarse y testearse con el fake, sin importar Firebase (verificado: cero imports de `firebase/*` en `src/application`, `src/domain`, `src/presentation` y `src/app`).
- TASK-018 solo debe cumplir el contrato + traducir errores; cualquier divergencia de semántica la detectarán tests de contrato reutilizables.
- La decisión 5 mantiene el filtrado por pertenencia como preocupación futura explícita (TASK-089/TASK-095) sin ensanchar esta tarea.
