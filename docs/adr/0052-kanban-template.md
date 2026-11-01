# ADR-0052: Plantilla Kanban y drag and drop del plan (CACH-PRD-008)

**Fecha:** 2026-10-30
**Estado:** Aceptado

## Contexto

El plan de tareas ya se deriva de `elements` con una vista lista y una vista
board de cuatro columnas (`TASK_STATUSES`), y el cambio de estado se resuelve
con `UpdateElement` desde un menú accesible (ADR-0036, ADR-0037). Las plantillas
de tablero existentes crean frames, notas y tareas, pero no una estructura
Kanban con columnas de estado.

ADR-0037 dejó el drag and drop fuera de alcance por accesibilidad y alcance de
esa fase. CACH-PRD-008 pide una plantilla Kanban y mover tarjetas entre columnas
arrastrando, manteniendo el menú de estado como alternativa.

## Decisión

1. **La plantilla Kanban vive en Application.** `kanban` se añade a
   `WORKSPACE_TEMPLATE_IDS` y a `WORKSPACE_TEMPLATES`. La definición crea cuatro
   frames en una fila (`Todo`, `In progress`, `Completed`, `Blocked`) y una
   tarea por estado, sin notas. Amplía `COLUMN_X` a cuatro columnas sin cambiar
   los tamaños existentes.

2. **Las columnas siguen el orden canónico de `TASK_STATUSES`.** Los frames y
   las tareas usan `todo`, `in_progress`, `completed` y `blocked` en ese orden,
   de modo que la plantilla coincide con las columnas del board y no introduce
   un orden de estado nuevo.

3. **Kanban crea un tablero de tipo `tasks`.** Al seleccionar la plantilla, el
   diálogo de creación sincroniza el tipo a `tasks`, reutilizando el modelo de
   `WorkspaceType` introducido en ADR-0051. La creación no necesita un comando
   nuevo.

4. **El drag and drop es nativo de Presentation.** Las tarjetas usan HTML5
   drag and drop (`draggable`, `dragstart`, `drop`) y cada columna reutiliza
   `onChangeStatus` para persistir con `UpdateElement`. No se crea comando,
   store ni dependencia nueva. `dragover` solo previene el comportamiento por
   defecto; no escribe en Firestore. La escritura ocurre únicamente en `drop`.

5. **El orden de las tarjetas se persiste en la tarea.** `TaskElement` gana un
   campo numérico `boardOrder`, con valor inicial `createdAt.getTime()`. El board
   ordena cada columna por `boardOrder` ascendente; la vista lista conserva el
   orden por vencimiento. `UpdateElement` acepta `boardOrder`, el mapper lo
   escribe y lee (con fallback a `createdAt` para documentos antiguos) y el
   orden se comparte entre usuarios y sobrevive a la recarga. No se crea una
   entidad ni un store nuevo.

6. **El estado de arrastre es efímero.** `draggingId`, el destino de drop y el
   anuncio viven en el panel. El orden sí se persiste; lo que no se persiste es
   el estado visual del arrastre.

7. **Cambiar el estado añade la tarea al final de la columna.** Desde el menú o
   el selector de estado se usa `nextBoardOrderForStatusChange`, que calcula el
   máximo `boardOrder` de la columna destino más uno. Al soltar una tarjeta se
   usa `resolveBoardOrderForDrop`: encima de una tarjeta inserta justo antes,
   sobre la cabecera de la columna inserta al principio y sobre el cuerpo o una
   columna vacía añade al final. `isBoardDropNoop` evita escrituras cuando el
   destino no cambia la posición. Si un cambio de estado llega sin `boardOrder`
   (por ejemplo desde el control de estado del canvas), `UpdateElement` asigna
   `updatedAt.getTime()`, de modo que también tiende al final de la columna.

8. **El menú de estado sigue siendo la vía accesible principal.** El
   `DropdownMenu` existente se mantiene. El drag and drop añade un
   `aria-describedby` con instrucciones, un `aria-live="polite"` que anuncia el
   movimiento y feedback visual con tokens (`data-dragging`, `data-drop-target`,
   `data-drop-before`, `data-drop-start`) sin transiciones que ignoren
   `prefers-reduced-motion`.

9. **El board mantiene 4/2/1 columnas.** No se introduce scroll horizontal: el
   grid reutiliza los breakpoints de ADR-0037 y solo cambia el feedback de
   arrastre.

## Alternativas consideradas

- **Crear una entidad o tipo de elemento "columna" o "tablero Kanban":**
  rechazado; duplicaría el modelo de `elements` y rompería la derivación del
  plan desde `TASK_STATUSES`.
- **Añadir una librería de drag and drop:** rechazado; HTML5 cubre el caso de
  escritorio y el proyecto evita dependencias nuevas para una interacción que
  ya tiene alternativa por teclado.
- **Guardar el orden en un store de presentación:** rechazado; se perdería al
  recargar y no se compartiría entre usuarios. El orden debe vivir en la tarea.
- **Reordenar escribiendo `boardOrder` en todas las tarjetas de la columna:**
  rechazado para el caso normal; las posiciones `start`/`end`/`before` se
  resuelven con un único `UpdateElement` sobre la tarea movida (valores enteros
  en los extremos y punto medio al insertar entre dos tarjetas).
- **Sustituir el menú de estado por drag and drop:** rechazado por
  accesibilidad; el drag and drop no funciona bien en táctil ni con teclado.
- **Forzar `type: 'tasks'` en el submit ignorando la elección del usuario:**
  rechazado; la plantilla sincroniza el tipo al seleccionarse y el usuario
  conserva la posibilidad de cambiarlo.

## Consecuencias

- La creación de tablero ofrece una plantilla Kanban con cuatro columnas y una
  tarea por estado.
- El board permite mover tarjetas con ratón, reordenarlas dentro de una columna
  y sigue permitiendo cambiar el estado con el menú accesible.
- El orden de las tarjetas es persistente y compartido: viaja en cada
  `TaskElement` (`boardOrder`) y la lista mantiene su orden por vencimiento.
- El movimiento se anuncia con `aria-live` y se refleja de inmediato en el
  panel; la persistencia y la reconciliación remota siguen siendo las de
  `UpdateElement`.
- Los empates de `boardOrder` se desempatan por id. Al crear una plantilla se
  asigna un `boardOrder` incremental por tarea para evitar empates iniciales. Si
  al insertar antes de una tarjeta sus vecinos empatan, se usa `target - 0.5`
  para quedar estrictamente antes; no se implementa rebalanceo de columna.
- El export JSON del board incluye `boardOrder` en las tareas para conservar el
  orden manual.
- Hay cambios de dominio (`TaskElement.boardOrder`), del comando
  `UpdateElement`, del mapper Firestore y de la ordenación del board. Las reglas
  de Firestore validan que `boardOrder`, si existe, sea un número finito dentro
  del rango seguro de JS; no cambian índices ni Storage.
- El contenido de la plantilla (títulos de frames y tareas) se mantiene en
  inglés, igual que las plantillas existentes; la localización del contenido de
  las plantillas queda fuera de alcance.
- ADR-0037 sigue vigente salvo el punto que dejaba el drag and drop fuera de
  alcance, sustituido por esta decisión.

## Referencias

- `docs/jiras/2026-10-28-product-polish-jira.md` — CACH-PRD-008.
- `docs/adr/0037-task-plan-board.md` — board derivado y menú de estado.
- `docs/adr/0051-workspace-type.md` — tipo de tablero `tasks`.
- `src/application/services/workspace-templates.ts`
- `src/application/services/task-plan.ts`
- `src/application/commands/update-element.ts`
- `src/domain/element/task-element.ts`
- `src/infrastructure/firebase/firebase-element-mapper.ts`
- `src/presentation/features/workspace-shell/components/task-plan-panel.tsx`
- `src/presentation/features/workspaces/components/create-workspace-dialog.tsx`
