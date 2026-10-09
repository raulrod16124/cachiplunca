# ADR-0006: Repository de Workspace sobre Firestore

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-018 — Firestore workspace repository (`docs/mvp-backlog.md`)

## Contexto

ADR-0005 definió el puerto `WorkspaceRepository` y declaró que sus tests de contrato serían "la especificación ejecutable que TASK-018 deberá cumplir". TASK-018 debe materializar ese contrato sobre Firestore: mapear documentos a entidades, persistir ids/timestamps y traducir errores, con el SDK confinado en Infrastructure (ADR-0001, ADR-0002). No existía ningún uso de Firestore en `src/`.

## Decisión

1. **Adapter factory + DI, patrón de ADR-0002.** `createFirebaseWorkspaceRepository(db: Firestore)` vive en `src/infrastructure/firebase/firebase-workspace-repository.ts`; el instance del SDK lo aporta `getFirebaseFirestore()` (`firebase-app.ts`, con cache de módulo como `getFirebaseAuth()`). La composición en UI llegará con TASK-019+.

2. **Forma del documento: id solo en la ruta.** `workspaces/{id}` es la fuente única de id (auto-id de `doc(collection(...))`); el documento guarda `name`, `createdAt`, `updatedAt` y `description`. Duplicar el id dentro del documento añade una superficie de divergencia sin beneficio. `Workspace` solo se reconstruye vía el mapper; los documentos nunca llegan a Application.

3. **Mapper puro sin import del SDK.** `firebase-workspace-mapper.ts` valida la forma del documento y acepta fechas como `Date` o `Timestamp`-like estructural (`value.toDate()`); la escritura usa `Date` (el SDK las convierte a `Timestamp`). Ventaja: tests unitarios del mapper sin mockear `firebase/firestore` y sin arrastrar el SDK al dominio de la prueba.

4. **Semántica de escritura.** `create` → `setDoc` completo; `update` → lectura + `Workspace.update` local (validación de invariantes sin red) + `updateDoc` solo con los campos cambiados, alineado con el last-write-wins por propiedad de la §5 del backlog; `delete` → prechequeo de existencia porque `deleteDoc` de Firestore resuelve sin error con ids inexistentes y el contrato exige `notFound`.

5. **Tabla de errores compartida.** `mapFirebaseError` (ADR-0001) gana códigos Firestore: `unauthenticated`, `invalid-argument` → `validation`; `resource-exhausted` → `persistence/unavailable`; `failed-precondition` y `aborted` → `persistence/write-failed`; `cancelled` → `network`. Los existentes no cambian. Un documento guardado que rompe invariantes de dominio se traduce a `validation`+`VALIDATION_INVALID_INPUT` con `cause` (simétrico con create/update).

6. **Contrato compartido + Firestore en memoria en tests.** La suite de ADR-0005 se extrajo a `src/test/contract/workspace-repository-contract.ts` y se ejecuta contra el fake y contra el adapter. El mock de `firebase/firestore` (`src/test/fixtures/in-memory-firestore.ts`) replica semántica peligrosa real: `deleteDoc` idempotente, `updateDoc` → `not-found`, fallos de red inyectables por código. El test de "instancias independientes" quedó como test específico del fake: dos adapters sobre el mismo `db` comparten backend por diseño.

## Alternativas consideradas

- **Suite de contrato duplicada para el adapter:** rechazada por deriva futura entre ambas copias; ADR-0005 anticipaba tests reutilizables.
- **Emulador de Firestore (`@firebase/rules-unit-testing`):** rechazado por añadir tooling y scripts nuevos; el contrato se verifica con el SDK mockeado (ADR-0003). El smoke manual queda pendiente con `npm run dev`.
- **`setDoc` completo en `update`:** descartado por pisar cambios concurrentes de otras propiedades; `updateDoc` parcial acota la escritura a lo realmente modificado.

## Consecuencias

- TASK-019-TASK-022 pueden implementarse contra el port y verificar el contrato sin tocar Firebase; la composición real será `createFirebaseWorkspaceRepository(getFirebaseFirestore())` en `src/app/config/`.
- `getFirebaseFirestore()` queda exportado sin consumir hasta la TASK-019+ (wiring).
- Si en el futuro se necesita id duplicado en el documento, ownership por usuario o índices, deberá abrirse tarea/ADR propio (relacionado con TASK-089/TASK-097).
