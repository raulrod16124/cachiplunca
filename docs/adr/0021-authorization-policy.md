# ADR-0021: Política de autorización Owner/Editor/Viewer

**Fecha:** 2026-10-13
**Estado:** Aceptado

## Contexto

TASK-016 definió `Membership` y los roles `owner`/`editor`/`viewer`, con helpers inline (`isOwner`, `isEditor`, `isViewer`, `canEdit`, `canView`). ADR-0017 y ADR-0018 difirieron la autorización a TASK-095/097. Antes de TASK-096 (frontend permission guards) y TASK-097 (Firebase Security Rules) se necesita una política explícita y testeable que responda "qué operación puede realizar un rol".

La autorización en este producto es de **un solo nivel**: el rol del usuario en el workspace. No hay permisos por recurso ni overrides; el MVP es deliberadamente simple.

## Decisión

1. **La política vive en Domain** (`src/domain/membership/authorization-policy.ts`): es lógica de negocio pura, sin React/Firebase/DOM, y se re-exporta desde `src/domain/membership/index.ts`. La resolución del rol (fetch de `Membership`) y la traducción a `AppError` son responsabilidad de las capas consumidoras, no del dominio.

2. **Operaciones explícitas por caso de uso.** Se modela la unión `WorkspaceOperation`:
   `workspace:view`, `workspace:update`, `workspace:delete`, `element:write`, `member:invite`, `member:update-role`, `member:remove`, `member:leave`.
   `element:write` agrupa crear/mover/redimensionar/eliminar/duplicar porque el rol las habilita o bloquea en bloque (no hay granularidad por tipo de elemento en el MVP).

3. **`PERMISSION_MATRIX` es la única fuente de verdad**, tipada como `Record<MembershipRole, readonly WorkspaceOperation[]>`, y `can(role, operation): boolean` es el único evaluador. Se evita duplicar la lógica en la entidad `Membership` y en guards de UI.

4. **Matriz aprobada:**

   | Operación                      | owner | editor | viewer |
   | ------------------------------ | ----- | ------ | ------ |
   | `workspace:view`               | ✅    | ✅     | ✅     |
   | `workspace:update` (renombrar) | ✅    | ❌     | ❌     |
   | `workspace:delete`             | ✅    | ❌     | ❌     |
   | `element:write`                | ✅    | ✅     | ❌     |
   | `member:invite`                | ✅    | ✅     | ❌     |
   | `member:update-role`           | ✅    | ❌     | ❌     |
   | `member:remove`                | ✅    | ❌     | ❌     |
   | `member:leave`                 | ✅    | ✅     | ✅     |

5. **Se alinea con herramientas consolidadas** (Figma, Miro): invitar/compartir es una capacidad de editor (no exclusiva del owner), coherente con ADR-0018 ("owner/editor can invite"); renombrar el recurso, cambiar roles, expulsar miembros y borrar el workspace son exclusivos de owner. El viewer nunca escribe (criterio de aceptación de TASK-095). `member:leave` se permite a todos los roles para que nadie quede atrapado en un workspace.

## Alternativas consideradas

- **Reutilizar solo los helpers de `Membership` (`canEdit`/`canView`):** rechazada; no expresan operaciones ni permiten distinguir invitar de gestionar miembros, y forzarían a TASK-096/097 a re-derivar la lógica.
- **Permitir que el editor renombre el workspace:** rechazada; en Figma/Miro el renombrado del recurso es admin/owner.
- **Permitir al viewer invitar (como Figma con `can view`):** rechazada por simplicidad del MVP; invitar queda en owner/editor.
- **Colocar la política en Application:** rechazada; es una invariante de negocio pura y debe ser consumible por dominio, UI y rules sin dependencias de framework.

## Consecuencias

- TASK-096 y TASK-097 consumen `can(role, operation)`; la UI solo refleja permisos y las Security Rules siguen siendo la autorización efectiva en backend.
- Los tests (`src/test/unit/domain/membership/authorization-policy.test.ts`) cubren las 24 combinaciones rol × operación y los criterios de aceptación explícitos (viewer bloqueado en escritura y gestión de miembros).
- Si TASK-016 quiere eliminar la doble fuente, `Membership.canEdit`/`canView` podrán delegar en `can(...)` sin cambiar comportamiento; se deja como refactor opcional para no ampliar el alcance de TASK-095.
- La matriz es aditiva: añadir operaciones futuras no altera las existentes.
