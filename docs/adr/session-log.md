# Session Log

## 2026-10-11 — TASK-069 Firestore element repository

- Siguiente tarea del backlog: TASK-069 (dependencia TASK-068 DONE, sin IN PROGRESS ni BLOCKED). Alcance confirmado con el usuario: implementar el adapter Firestore del `ElementRepository` usando colección top-level `elements` con campo `workspaceId` (el port no incluye `workspaceId` en `findById`/`delete`/`deleteMany`, por lo que una subcolección por workspace no es viable sin cambiar el contrato ya cerrado de TASK-068).
- Nuevo `src/infrastructure/firebase/firebase-element-mapper.ts`: mapper puro sin import del SDK. Define `ElementDocument` como unión discriminada por tipo (`TextElementDocument`, `NoteElementDocument`, `TaskElementDocument`, `FrameElementDocument`, `ConnectorElementDocument`, `LinkElementDocument`). `toElementDocument` aplana value objects a primitivos y omite campos opcionales ausentes; `fromElementDocument` valida la forma del documento, acepta fechas `Date` o `Timestamp`-like, y reconstruye entidades de dominio via las factories `create*Element`.
- Nuevo `src/infrastructure/firebase/firebase-element-repository.ts`: `createFirebaseElementRepository(db: Firestore)`. Opera sobre la colección `elements`, con `listByWorkspace` via `query(..., where('workspaceId', '==', ...))`. `save`/`saveMany` validan entidades y escriben con `setDoc`; `delete`/`deleteMany` prechequean existencia (Firestore `deleteDoc` es idempotente) y lanzan `AppError` `notFound` si falta algún id. Todos los errores del SDK pasan por `mapFirebaseError`; documentos corruptos se traducen a `validation`/`VALIDATION_INVALID_INPUT`.
- Extensión de `src/test/fixtures/in-memory-firestore.ts` con `query` y `where` para poder testear `listByWorkspace` sin emulador de Firestore. El mock replica solo `==` sobre campos simples, suficiente para el contrato.
- Tests: nuevo `src/test/unit/infrastructure/firebase/firebase-element-mapper.test.ts` (round-trip de los 6 tipos, campos opcionales omitidos, fechas Timestamp-like, documentos corruptos) y `src/test/unit/infrastructure/firebase/firebase-element-repository.test.ts` (contrato reutilizable + tests específicos de persistencia, errores Firebase, documentos corruptos y query por workspace).
- Quality gates en verde: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` (1121 tests, 94 suites) y `npm run build` (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: la decisión sigue el patrón de adapter/mapper de ADR-0006 para workspaces; la elección de colección top-level `elements` deriva del contrato del port de TASK-068 y se documenta aquí.

## 2026-10-11 — TASK-068 Element repository port

- Siguiente tarea del backlog: TASK-068 (dependencia TASK-037 DONE, sin IN PROGRESS ni BLOCKED). Alcance confirmado con el usuario: **definir el port de persistencia de elementos** en Application, con un fake en test y un contrato reutilizable para el adapter Firestore de TASK-069.
- Nuevo `src/application/ports/element-repository.ts`: `ElementRepository` con `listByWorkspace`, `findById`, `save`, `saveMany`, `delete` y `deleteMany`. El port depende solo de `domain/element` y `domain/shared` (sin React, Firebase, UI ni APIs del navegador). Exportado en `src/application/ports/index.ts`.
- Decisión de diseño: el repositorio **persiste elementos ya construidos** (`save` con semántica de upsert) porque los comandos de creación (`create-element.ts`, TASK-044) ya generan `ElementId` y timestamps vía dependencias inyectadas; evita duplicar la generación de identidad en Infrastructure y mantiene la simetría con `Move/Resize/Update/Delete`. Incluye métodos batch (`saveMany`/`deleteMany`) para satisfacer "contrato compatible con batching" sin anticipar la orquestación de TASK-072/073.
- Nuevo `src/test/fixtures/fake-element-repository.ts`: `FakeElementRepository` en memoria implementa el port, aísla workspaces, revalida entidades con `validateElement` y traduce errores a `AppError` (`validation`/`notFound`).
- Nuevo `src/test/contract/element-repository-contract.ts`: suite parametrizable que verifica lista vacía, lectura/escritura, round-trip de los 6 tipos MVP con preservación de `position`/`size`/campos específicos, upsert, aislamiento por workspace, batching y errores tipados.
- Nuevo `src/test/unit/application/ports/fake-element-repository.test.ts`: ejecuta el contrato contra el fake y añade tests de identidad de instancia e independencia entre repositorios.
- Quality gates en verde: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` (1083 tests, 92 suites) y `npm run build` (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: la decisión sigue el patrón de ports/repositories ya documentado en ADR-0005 y ADR-0006 para workspaces; el port de elementos es una extensión coherente del mismo modelo.

## 2026-10-11 — TASK-067 History edge cases

- Siguiente tarea del backlog: TASK-067 (dependencia TASK-066 DONE, sin IN PROGRESS ni BLOCKED). Alcance confirmado con el usuario: **endurecer + tests exhaustivos** sobre el `CommandHistory` en Application; `command-history.ts` solo se toca si un test revela un defecto real.
- Revisión del manager (`src/application/services/command-history.ts`): sin defectos funcionales detectados (pilas respetan capacity, la rama redo solo se limpia en `execute` exitoso, y los errores restauran el comando a su pila sin corromper estado). **Producción intacta** por diseño (no-scope-creep).
- Tests en `src/test/unit/application/services/command-history.test.ts` (+20 casos): refactor menor del helper `move` hacia `moveElementTo` reutilizable; casos dirigidos de edge cases (capacity=1, capacity exacta sin evicción, capacity fraccionaria→floor, capacity negativa/NaN/Infinity→default, execute con error conserva la rama redo, redo con error restaura `redoStack`, clear conserva estado y capacity, no-op devuelve la misma instancia de estado, secuencia intercalada undo/redo con flags) y **test de propiedad determinista** (mulberry32, 3 semillas × 3 capacities × 600 ops `execute|undo|redo`) con un modelo de referencia independiente que reconstruye el estado desde `base + undoSteps` y verifica en cada paso `getState()`, `canUndo/canRedo` y el acotamiento de pilas por capacity.
- Resultado: 1068 tests pasan (91 suites). Quality gates en verde: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: no hay decisión arquitectónica significativa (el contrato ya está en ADR-0007; decisión local de testeo/refuerzo, coherente con TASK-064).

## 2026-10-11 — TASK-065 Undo

- Siguiente tarea del backlog: TASK-065 (dependencia TASK-064 DONE, sin IN PROGRESS ni BLOCKED). Alcance confirmado con el usuario: **solo Undo** ahora (Redo queda para TASK-066) y conexión del history manager vía **hook de Presentation + callback** (Canvas controlado, sin store de elementos, coherente con TASK-057→061).
- En Application (`src/application/services/selection-keyboard.ts`): `SelectionKeyCommand` gana `'undo'` y `SelectionKeyInput` gana `shiftKey` (necesario para no confundir `Ctrl/Cmd+Shift+Z`); se resuelve `(ctrlKey || metaKey) && !altKey && !shiftKey && key.toLowerCase() === 'z'` → `'undo'`. Actualizados los llamadores (`use-element-delete`, `use-element-copy-paste`, `use-element-duplicate`, `use-selection-keyboard`) para propagar `event.shiftKey`; `use-selection-keyboard` ignora explícitamente `'undo'`.
- En Presentation, nuevo hook `src/presentation/canvas/hooks/use-element-undo.ts` (espejo de `use-element-delete.ts`): `{ history?, onUndoElements?, disabled? }`, listener `keydown` en el contenedor, ignora `repeat`/targets editables/`disabled`, exige `history.canUndo()`, hace `preventDefault` y emite `onUndoElements(result.state)` solo si el resultado es `ok` (y se abstiene de `preventDefault` cuando no hay nada que deshacer). Exportado en `hooks/index.ts`.
- Cableado: `Canvas` gana props opcionales `history?: CommandHistory<readonly Element[]>` y `onUndoElements?`, `elementUndoRef` en `setContainerRef`, `aria-keyshortcuts` ampliado con `Control+Z Meta+Z` y hint con "Ctrl/Cmd + Z to undo". `WorkspaceShellContainer` crea `commandHistoryRef = useRef(createCommandHistory<readonly Element[]>({ initial: [] }))` y lo pasa por `WorkspaceShellLayout` → `Canvas` (mismo patrón que viewport/selection stores), dejando el owner listo para TASK-066/072.
- Decisiones confirmadas: (1) solo `Ctrl/Cmd+Z` en esta tarea; `Shift+Z` (redo) y `Alt` quedan fuera; (2) `shiftKey` pasa a ser parte explícita del input del resolver para poder distinguir undo de redo sin heurísticas sobre la caja de la tecla; (3) sin `preventDefault` ni callback cuando no hay historial undoable, coherente con los no-op silenciosos de delete/copy-paste; (4) sin ADR por ser una decisión local de interacción (precedente TASK-057→064).
- Tests: `selection-keyboard.test.ts` (+6: Ctrl/Cmd/Z mayúscula, plain Z, Alt y Shift ignorados) y nuevo `use-element-undo.test.tsx` (10: sin keydown, Ctrl+Z y Cmd+Z deshacen y emiten el estado previo, sin historial undoable, repeat, target editable, disabled, sin history, `preventDefault` y cleanup), +3 de integración en `canvas.test.tsx` (Ctrl+Z, Cmd+Z y sin history). 1025 tests pasan (90 suites).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).

## 2026-10-11 — TASK-064 Command history manager

- Siguiente tarea del backlog: TASK-064 (dependencia TASK-063 DONE, sin IN PROGRESS ni BLOCKED). Alcance confirmado con el usuario: **manager completo reversible** (execute + undo + redo + canUndo/canRedo + clear + capacity) en Application; TASK-065/066 se reservan al wiring en Presentation/atajos y TASK-067 a edge cases adicionales.
- Nuevo `src/application/services/command-history.ts`: `createCommandHistory<S>({ initial, capacity? })` genérico sobre el estado, React/Firebase-free. Pilas `undoStack`/`redoStack`; `execute` apila y **limpia el redo** (branching); en `error` devuelve el `CommandResult` sin mutar estado ni historial; `undo`/`redo` aplican `command.undo`/`command.execute` y mueven el comando entre pilas (restaurándolo si falla); `capacity` (default `DEFAULT_COMMAND_HISTORY_CAPACITY = 100`, inválida → default) descarta el más antiguo; `clear` vacía ambas pilas sin tocar el estado. Nunca muta el estado de entrada. Exportado en `services/index.ts`.
- Decisiones: (1) `undo`/`redo` sin historial son **no-op que devuelven el estado actual como `ok`** (los consumidores comprueban `canUndo`/`canRedo`), coherente con el no-op silencioso de `canvas-viewport-store`/`selection-store` y con `deleteElements([])`; evita inventar códigos de error; (2) el error previsible del comando se propaga como valor (`AppError`) sin corromper el historial; (3) "manager completo" en una sola tarea para evitar métodos sin definir entre TASK-064/065/066.
- Tests: nuevo `src/test/unit/application/services/command-history.test.ts` (11 casos: estado inicial; execute registra; undo→redo; múltiples pasos en orden; branching invalida redo; fallo → `AppError` de validación sin tocar estado/historial; no-op sin historial; clear; capacity descarta el más antiguo; capacity inválida → default; inmutabilidad del estado de entrada en secuencia válida) componiendo `createMoveElement` sobre `readonly Element[]`. 1005 tests pasan (89 suites).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: el contrato `Command<S>`/`CommandResult<S>` ya está en ADR-0007; esta es una decisión local de implementación.

## 2026-10-11 — TASK-063 Command interface

- Siguiente tarea del backlog: TASK-063 (dependencia TASK-044 DONE, sin IN PROGRESS ni BLOCKED); primera TODO ejecutable tras el cierre de TASK-062 (la capa Presentation quedó al día con TASK-061/062). Decisiones confirmadas con el usuario: contrato genérico `Command<S>`, incluir factory en producción y sin refactorizar los comandos existentes, con ADR.
- Nuevo `src/application/commands/command.ts`: `CommandMetadata { label }`, `CommandResult<S> = CommandOk<S> | CommandFailure` (con `AppError`), interfaz `Command<S>` (`metadata`, `execute(state)`, `undo(state)`) y factoría `createFunctionCommand<S>({ metadata, apply, revert })`. Sin React/Firebase/UI/persistencia; genérico sobre el estado para no acoplarse a entidades concretas. Exportado en `commands/index.ts`.
- Sin cambios en Domain/Infrastructure/Presentation ni en los comandos TASK-044–TASK-049 (evitar scope creep): el contrato se compondrá dentro de comandos reversibles en TASK-064+.
- Tests: `command.test.ts` (7 casos: metadata; delegación apply/revert del factory; execute inmutable; undo restaura el estado exacto; `execute→undo→redo`; error de validación como `AppError` sin lanzar; secuencias válidas sin corrupción) componiendo `createMoveElement` sobre `readonly Element[]`.
- ADR-0007 registra el modelo `execute`/`undo` genérico, el resultado discriminado con `AppError`, los metadatos mínimos y el desacoplamiento de UI/persistencia.
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).

## 2026-10-11 — TASK-061 Copy/paste

- Siguiente tarea del backlog: TASK-061 (dependencia TASK-060 DONE, sin IN PROGRESS ni BLOCKED); primera TODO ejecutable. La capa Application ya venía commiteada (`1a8f85b`) pero la tarea seguía TODO: faltaba la integración en Presentation y el cierre.
- En Presentation, nuevo hook `src/presentation/canvas/hooks/use-element-copy-paste.ts` (espejo de `use-element-duplicate`): clipboard en memoria (`clipboardRef`) con los elementos copiados; `Ctrl/Cmd+C` ejecuta `copyElements(elements, selectedIds)` y guarda el snapshot solo si hay selección; `Ctrl/Cmd+V` ejecuta `pasteElements(elements, clipboard, { generateId, now?, offset? })` con el offset por defecto `DEFAULT_PASTE_OFFSET` (16,16) y emite `onPasteElements(elements, pastedIds)` cuando hay clipboard y `generateId`/callback disponibles. Ignora `repeat`, targets editables, `disabled` y hace `preventDefault` solo cuando maneja el comando. Exportado en `hooks/index.ts`.
- Cableado en `Canvas`: prop `onPasteElements?`, `elementCopyPasteRef` en `setContainerRef`, selección de los ids pegados tras pegar (mismo patrón que duplicate), `aria-keyshortcuts` ampliado con `Control+C Meta+C Control+V Meta+V` y hint actualizado. `use-selection-keyboard.ts` ignora explícitamente `'copy'`/`'paste'` para no interceptar ni vaciar la selección.
- Decisiones confirmadas con el usuario: clipboard **en memoria** (sin portapapeles del sistema) y offset fijo de 16px al pegar (consistente con Duplicate).
- Tests: nuevo `use-element-copy-paste.test.tsx` (15 casos: copia/pega Ctrl/Cmd, multiselección, offset, pegar sin copy, copy sin selección, editable, repeat, disabled, sin `generateId`, sin callback, `preventDefault`, cleanup), +12 casos en `selection-keyboard.test.ts` (`Ctrl/Cmd+C → copy`, `Ctrl/Cmd+V → paste`, Alt ignorado, plain sin modificador) y 4 casos de integración en `canvas.test.tsx` (copy/paste con selección simple y múltiple, pegar sin copy, copy sin selección). 987 tests pasan (87 suites).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: decisión local de interacción/composición, coherente con TASK-059/060.

## 2026-10-11 — TASK-059 Delete elements

- Siguiente tarea del backlog: TASK-059 (dependencia TASK-048 DONE, sin IN PROGRESS ni BLOCKED); primera TODO ejecutable tras el cierre de TASK-058.
- En Application, `src/application/services/element-delete.ts`: `deleteElements(elements, ids)` recorre en orden preservando el resto, valida cada elemento objetivo con `createDeleteElement` (TASK-048) y devuelve `{ status: 'ok', elements } | { status: 'error', error }` con `AppError` de validación (nunca lanza); no muta las entradas y devuelve un array nuevo. Exportado en `services/index.ts`.
- `selection-keyboard.ts`: se añade el comando `'delete'` a `SelectionKeyCommand`, resuelto para la tecla `Delete` (sin modificadores). `use-selection-keyboard.ts` se ajusta para ignorar explícitamente `'delete'` y no interceptar `preventDefault`/`onClear`.
- Nuevo hook `src/presentation/canvas/hooks/use-element-delete.ts` (Application-service + callback, espejo de move/resize): listener `keydown` en el surface, ignora `repeat` y targets editables, exige selección no vacía, resuelve el comando a `'delete'`, hace `preventDefault`, llama a `deleteElements` y emite `onDeleteElements(restantes)` + `onSelectionCleared`; solo si el resultado es `ok`. Exportado en `hooks/index.ts`.
- Cableado en `Canvas`: prop `onDeleteElements?`, `useElementDelete({ elements, selectedIds, onDeleteElements, onSelectionCleared: handleClear })`, `elementDeleteRef` en `setContainerRef`, `aria-keyshortcuts` ampliado con `Delete` y hint actualizado. Canvas sigue controlado por callback (sin store de elementos).
- Decisiones confirmadas con el usuario: disparador **solo tecla `Delete`** (Backspace fuera), se borra **toda la multiselección**, y **sin cascada** de ConnectorElement huérfanos (diferido; no está en el backlog actual).
- Tests: `element-delete.test.ts` (7), `use-element-delete.test.tsx` (11) y 3 casos de integración (`describe('deletion')`) en `canvas.test.tsx`; `selection-keyboard.test.ts` actualizado a `Delete → 'delete'`. 918 tests pasan (82 suites). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: decisión local de interacción/composición, coherente con TASK-047/048/057/058.

## 2026-10-11 — TASK-058 Resize elements

- Siguiente tarea del backlog: TASK-058 (dependencia TASK-047 DONE, sin IN PROGRESS ni BLOCKED); primera TODO ejecutable tras el cierre de TASK-057.
- En Application, `src/application/services/element-resize.ts`: `ResizeHandleAnchor` (8 anclas), `MIN_ELEMENT_SIZE`, `resizeElementByHandle(element, anchor, worldDelta, { now?, minSize? })`. Calcula posición/tamaño desde los bounds del elemento y el delta, clampea al mínimo por eje (nunca dimensiones negativas), delega el tamaño en `createResizeElement` (TASK-047) y aplica `withPosition` cuando el ancla mueve el origen, con `updatedAt` inyectado; resultado `ok | error` con `AppError` de validación. Puro, sin mutar entradas. Exportado en `services/index.ts`.
- En Presentation, handles interactivos en `selection-overlay.tsx`: `data-resize-handle`/`data-resize-anchor` por handle, `pointer-events: auto` y cursor por ancla (`nwse-resize`, `ns-resize`, etc.); el overlay sigue `pointer-events: none`. El tipo de ancla se importa de Application (fuente única).
- Nuevo hook `src/presentation/canvas/hooks/use-element-resize.ts` (espejo de `use-element-move.ts`): detecta el ancla vía `closest('[data-resize-handle]')`, exige selección simple, `setPointerCapture`, umbral `DRAG_SELECTION_THRESHOLD`, `Viewport.screenToWorld` y `onResizeElements(elements)` solo si el callback existe. Ignora `spacePressed`, botón no primario, targets interactivos y anclas desconocidas. Exportado en `hooks/index.ts`.
- Cableado en `Canvas`: prop `onResizeElements?`, `data-resizing` y cursor de fallback; `[data-resize-handle]` añadido a `isInteractiveTarget` de `use-drag-selection.ts` como guard defensivo (los handles quedan fuera de `[data-selectable]`, así que move/pan no los capturan).
- Decisiones confirmadas con el usuario: Canvas controlado por callback (sin store de elementos) y resize de **elemento único**, coherente con el overlay y su test vigente (los handles solo se dibujan en selección simple; la multiselección queda fuera de alcance).
- Tests: `element-resize.test.ts` (13), `use-element-resize.test.tsx` (10), `selection-overlay.test.tsx` (4) nuevas suites y 3 casos de integración en `canvas.test.tsx`; 897 tests pasan (80 suites). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: decisión local de interacción/composición, coherente con TASK-047/057.

## 2026-10-11 — TASK-057 Move elements

- Siguiente tarea del backlog: TASK-057 (dependencias TASK-046/051/052/053 DONE, sin IN PROGRESS ni BLOCKED); confirmado por el cierre de TASK-056.
- En Application, `src/application/services/element-move.ts`: `resolveMoveIds(hitId, selectedIds)` y `moveElementsByDelta(elements, ids, delta, { now? })`. El helper aplica un delta de mundo desde la posición absoluta capturada en el `pointerdown` (no acumula), delega en `createMoveElement`/`withPosition`, preserva orden y no muta las entradas; resultado `ok | error` con `AppError` de validación. Exportado en `services/index.ts`. Sin dependencias de React/Firebase/UI (Clean/Hexagonal intactas).
- En Presentation, `src/presentation/canvas/hooks/use-element-move.ts`: arrastre por pointer events con umbral `DRAG_SELECTION_THRESHOLD`, `setPointerCapture`, `Viewport.screenToWorld`, gestos aditivos/`spacePressed`/botón central/interactivos ignorados, y `onMoveElements(elements)` solo si el callback existe (Canvas controlado, sin store de elementos). Click sin arrastre → `onSelectOnly(id)`. Cableado en `Canvas` con prop `onMoveElements?`, colapso diferido en `handleSelect`, `data-moving` + cursor `grabbing`.
- Decisiones confirmadas con el usuario: Canvas controlado por callback (sin store nuevo; board store llega en TASK-070/072) y el arrastre mueve la multiselección completa, con click que colapsa.
- Tests/quality gates: `element-move.test.ts` (12), `use-element-move.test.tsx` (11) y 3 casos de integración en `canvas.test.tsx`; 866 tests pasan (77 suites). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: decisión local de interacción/composición, coherente con TASK-046/050/051.

## 2026-10-11 — TASK-055 Connector renderer

- Siguiente tarea del backlog: TASK-055 (dependencias TASK-042 y TASK-050 DONE, sin IN PROGRESS ni BLOCKED); confirmado por el cierre de TASK-054. Es la primera TODO ejecutable.
- Nuevo `src/presentation/canvas/renderers/connector-renderer.tsx`, mismo patrón que `text/note/task/frame-renderer.tsx`: narrowing con `isConnectorElement`, `return null` para no-connector, raíz `styled.svg` con `data-element-content="true"` y `data-element-type="connector"`, y endpoints expuestos como hooks de test `data-connector-source`/`data-connector-target`. Exportado en `renderers/index.ts`.
- Representación visual (decisión confirmada con el usuario): SVG que llena la caja de `ElementView` (`width/height 100%`, `overflow: visible`) dibujando una línea diagonal de source→target (`2%`→`98%`) con `marker-end` de punta de flecha. El `id` del marker se deriva de forma determinista del id del elemento (`connector-arrow-<id>` saneado) para evitar colisiones entre conectores sin hooks de estado. El renderer no resuelve la geometría real de los endpoints: `ElementView` solo entrega su propio elemento y la resolución de extremos queda para una tarea futura (no existe aún en el backlog); por eso el trazo se dibuja dentro de la propia caja.
- Sin cambios en `resolveElementRenderer`/`ElementRendererRegistry` (ya soportaban `'connector'` vía `ElementType`) ni en Domain/Application. Sin registro central ni wiring en `Canvas` (los elementos no se cargan hasta TASK-070), coherente con TASK-051→054.
- Tests en `src/test/unit/presentation/canvas/renderers/connector-renderer.test.tsx` (6 casos: data-attrs de contenido/tipo, endpoints source/target, coordenadas de la línea, wiring línea↔marker de flecha, `null` ante un `TextElement` y delegación real vía `ElementView` con `renderers={{ connector: ConnectorRenderer }}` sin fallback).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` (836 tests, 74 suites) y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: decisión local de presentación sobre styled-components, coherente con TASK-050/051/052/053/054.

## 2026-10-10 — TASK-053 Task renderer

- Siguiente tarea del backlog: TASK-053 (dependencias TASK-040 y TASK-050 DONE, sin IN PROGRESS); confirmado por el cierre de TASK-052. Sin IN PROGRESS ni BLOCKED.
- Nuevo `src/presentation/canvas/renderers/task-renderer.tsx`, mismo patrón que `text-renderer.tsx`/`note-renderer.tsx`: narrowing con `isTaskElement`, `return null` para no-task, raíz styled-components con `data-element-content="true"`, `data-element-type="task"` y `data-task-status`. Renderiza `title`, etiqueta de estado en inglés (`Todo`/`In progress`/`Done`) y, de forma condicional, `assigneeId.value` (`data-task-assignee`) y `dueDate` en ISO `YYYY-MM-DD` (`data-task-due-date`). Exportado en `renderers/index.ts`.
- `dueDate` se formatea con un helper puro local (`toISOString().slice(0, 10)`) para que la salida sea determinista y testeable; el formateo localizado se deja a una tarea de UI posterior.
- Sin cambios en `resolveElementRenderer`/`ElementRendererRegistry` (ya soportaban `'task'` vía `ElementType`) ni en Domain/Application.
- Tests en `src/test/unit/presentation/canvas/renderers/task-renderer.test.tsx` (9 casos: título, data-attrs + estado, los tres estados con su etiqueta, assignee presente/ausente, dueDate ISO presente/ausente, `null` para TextElement, delegación vía `ElementView` con `{ task: TaskRenderer }`).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` (824 tests, 72 suites) y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Sin ADR nuevo: no hay decisión arquitectónica significativa; el renderer se mantiene Presentation-only sobre styled-components, coherente con TASK-050/051/052.

## 2026-10-10 — TASK-052 Note renderer

- Siguiente tarea del backlog: TASK-052 (dependencias TASK-039 y TASK-050 DONE, sin IN PROGRESS); confirmado por el cierre de TASK-051.
- Nuevo `src/presentation/canvas/renderers/note-renderer.tsx`, espejo de `text-renderer.tsx`: narrowing con `isNoteElement`, `return null` para no-note, raíz styled-components con `data-element-content="true"`/`data-element-type="note"`, `content` y fondo con `element.color` (inline style) o token `--rr-color-background-default` cuando no hay color. Exportado en `renderers/index.ts`.
- Sin cambios en `resolveElementRenderer`/`ElementRendererRegistry` (ya soportaban `'note'` vía `ElementType`) ni en Domain/Application.
- Tests en `src/test/unit/presentation/canvas/renderers/note-renderer.test.tsx` (8 casos: contenido, data-attr, whitespace, vacío, color aplicado, ausencia de color, `null` para TextElement, delegación vía `ElementView` con `{ note: NoteRenderer }`).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` (815 tests, 71 suites) y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el renderer solo aporta contenido interno; posición/tamaño/rotación siguen en `ElementView`; (2) se mantiene styled-components en los renderers de canvas, sin `@raulrod/ui`, por consistencia con TASK-050/051; (3) sin ADR por ser una decisión local de render.

## 2026-10-10 — TASK-050 Canvas rendering abstraction

- Siguiente tarea del backlog: TASK-050 (dependencia TASK-037 DONE, sin IN PROGRESS); confirmado por el cierre de TASK-049.
- Abstracción de render en Presentation (`src/presentation/canvas/renderers/`): `ElementRendererProps { element, selected }`, `ElementRenderer`, `ElementRendererRegistry = Partial<Record<ElementType, ElementRenderer>>`; `DefaultElementRenderer` (caja neutra, fallback); `resolveElementRenderer(registry, type)` puro que devuelve el renderer registrado o el default sin lanzar; `ElementView` posiciona el contenedor en coordenadas mundo (`left/top/width/height` desde `element.position`/`size`, `rotate(element.rotation)`) y expone `data-selectable`/`data-selected`/`data-element-type`/`data-element-id`/`data-testid="canvas-item-<id>"` para conservar los guards de pan/selección y los testids; el contenido se delega en el renderer resuelto.
- Mapper puro Domain→Application en `src/application/services/canvas-hit-test.ts`: `toSelectableItem(element)` / `toSelectableItems(elements)` derivan `Bounds.fromXYWH(position.x, position.y, size.width, size.height)`; el hit-test/selección siguen desacoplados y React-free.
- `Canvas` pasa de `items: SelectableItem[]` a `elements?: Element[]` + `renderers?: ElementRendererRegistry`; deriva `items` con `useMemo(toSelectableItems)` para `useSelection`/`useDragSelection`/`SelectionOverlay`/teclado y sustituye el loop `SelectableNode` por `ElementView`. Pan, zoom, marquee, overlay y atajos intactos. El caller productivo (`workspace-shell-layout`) no pasa elementos todavía.
- Tests: +11 casos netos → `toSelectableItem(s)` (3) en `canvas-hit-test.test.ts`, `resolve-element-renderer` (3, fallback sin registry/tipo ausente/renderer registrado) y `ElementView` (5, posición/tamaño, rotación + data-attrs, estado seleccionado, fallback y renderer inyectado); `canvas.test.tsx` migrado de `SelectableItem` a `Element` sin cambios de comportamiento observable. 801 tests pasan (69 suites).
- Quality gates: `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) la abstracción es Presentation-only y no introduce renderers concretos (TASK-051–056) ni persistencia; (2) el fallback garantiza que cualquier tipo sin renderer siga siendo visible y seleccionable; (3) el mapper vive en Application por ser lógica pura de interacción (Application→Domain), no de UI; (4) sin ADR por ser una decisión local de composición de render.

## 2026-10-10 — TASK-043 LinkElement

- Siguiente tarea del backlog: TASK-043 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `LinkElement` ya existía como tipo + `validateLinkElement` (TASK-037); el hueco era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-056.
- Nuevo módulo `src/domain/element/link-element.ts`: `createLinkElement(props)` (defaults de `rotation`/timestamps, valida `url` string no vacío y `title` opcional no vacío) y actualizaciones puras `withLinkUrl` y `withLinkTitle` (devuelven copia, revalidan, no mutan). `withLinkTitle` acepta `undefined` para limpiar el título y omite el campo del objeto (mismo patrón que `note-element.ts`/`task-element.ts`).
- Errores con `Error` descriptivo, consistente con los validadores de dominio; no se tocó `element-types.ts`.
- Tests en `src/test/unit/domain/element/link-element.test.ts` (17 casos, sin `any` ni casts; datos no confiables con `Object.assign`).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` y `build` en verde. `link-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-10 — TASK-042 ConnectorElement

- Siguiente tarea del backlog: TASK-042 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `ConnectorElement` ya existía como tipo + `validateConnectorElement` (TASK-037); el hueco era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-057.
- Nuevo módulo `src/domain/element/connector-element.ts`: `createConnectorElement(props)` (defaults de `rotation`/timestamps, valida `sourceElementId`/`targetElementId` como `ElementId` y distintos) y actualizaciones puras `withConnectorSource` y `withConnectorTarget` (devuelven copia, revalidan, no mutan).
- La regla de auto-conexión (`source === target`) se reutiliza de `validateConnectorElement`; no se duplica la lógica de dominio, solo se anticipa en los helpers `assert*` para dar errores claros sobre datos no confiables.
- Errores con `Error` descriptivo, consistente con los validadores de dominio; no se tocó `element-types.ts`.
- Tests en `src/test/unit/domain/element/connector-element.test.ts` (13 casos, sin `any` ni casts; datos no confiables con `Object.assign`).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` (677 tests) y `build` en verde. `connector-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-10 — TASK-041 FrameElement

- Siguiente tarea del backlog: TASK-041 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `FrameElement` ya existía como tipo + `validateFrameElement` (TASK-037); el hueco era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-054.
- Nuevo módulo `src/domain/element/frame-element.ts`: `createFrameElement(props)` (defaults de `rotation`/timestamps, valida `title` no vacío y `parentFrameId` opcional como `ElementId`) y actualizaciones puras `withFrameTitle` y `withFrameParent` (devuelven copia, revalidan, no mutan). `withFrameParent` acepta `undefined` para limpiar el anidamiento y omite el campo del objeto (mismo patrón que `note-element.ts`/`task-element.ts`).
- La auto-referencia (`parentFrameId === id`) queda cubierta por `validateFrameElement`, no se duplica la regla.
- Errores con `Error` descriptivo, consistente con los validadores de dominio; no se tocó `element-types.ts`.
- Tests en `src/test/unit/domain/element/frame-element.test.ts` (17 casos, sin `any` ni casts; datos no confiables con `Object.assign`).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` y `build` en verde. `frame-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-10 — TASK-040 TaskElement

- Siguiente tarea del backlog: TASK-040 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `TaskElement` ya existía como tipo + `validateTaskElement` + `TASK_STATUSES` (TASK-037); el hueco era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-053.
- Nuevo módulo `src/domain/element/task-element.ts`: `createTaskElement(props)` (defaults de `rotation`/timestamps, valida `title` no vacío, `status ∈ TASK_STATUSES`, `assigneeId`/`dueDate` opcionales válidos) y actualizaciones puras `withTaskTitle`, `withTaskStatus`, `withTaskAssignee` y `withTaskDueDate` (devuelven copia, revalidan, no mutan). Los helpers de opcionales aceptan `undefined` para limpiar el campo y lo omiten del objeto (mismo patrón que `note-element.ts`).
- Errores con `Error` descriptivo, consistente con los validadores de dominio; no se tocó `element-types.ts`.
- Tests en `src/test/unit/domain/element/task-element.test.ts` (21 casos, sin `any` ni casts; datos no confiables con `Object.assign`).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` (647 tests) y `build` en verde. `task-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-10 — TASK-039 NoteElement

- Siguiente tarea del backlog: TASK-039 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `NoteElement` ya existía como tipo + `validateNoteElement` (TASK-037); el hueco era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-052.
- Nuevo módulo `src/domain/element/note-element.ts`: `createNoteElement(props)` (defaults de `rotation`/timestamps, valida `content` string definido —permite vacío— y `color` opcional no vacío) y actualizaciones puras `withNoteContent` y `withNoteColor` (devuelven copia, revalidan, no mutan). Errores con `Error` descriptivo, consistente con los validadores de dominio.
- `color` se omite del objeto cuando es `undefined` para mantener el discriminante limpio; la unión discriminada en `element-types.ts` no se tocó.
- Tests en `src/test/unit/domain/element/note-element.test.ts` (17 casos, sin `any` ni casts; datos no confiables con `Object.assign`).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` (626 tests) y `build` en verde. `note-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-10 — TASK-038 TextElement

- Siguiente tarea del backlog: TASK-038 (dependencia TASK-037 DONE, sin IN PROGRESS).
- `TextElement` ya existía como tipo + `validateTextElement` (TASK-037); el hueco real era el comportamiento de creación/edición que necesitarán TASK-044 y TASK-051.
- Nuevo módulo `src/domain/element/text-element.ts`: `createTextElement(props)` (defaults de `rotation`/timestamps, valida `content` string definido, permite vacío y sin límite) y `withTextContent(element, content, updatedAt?)` (pura, devuelve copia, revalida, no muta el original). Errores con `Error` descriptivo, consistente con los validadores de dominio.
- Se mantuvo `element-types.ts` como contrato de la unión discriminada para evitar churn en TASK-039–043.
- Tests en `src/test/unit/domain/element/text-element.test.ts` (10 casos, sin `any` ni casts).
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` (611 tests) y `build` en verde. `text-element.ts` sin imports de React/Firebase/UI.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.

## 2026-10-09 — TASK-037 BaseElement

- Siguiente tarea del backlog: TASK-037 (dependencia TASK-026 DONE, sin IN PROGRESS).
- El commit previo `f9ba0ee` había dejado la tarea a medio consolidar: `BaseElementProps` duplicado en dos ficheros, clase abstracta `BaseElement` sin usar ni exportar, `TaskStatus` sin uso, tests con `any`/casts y `format:check` roto en `jest.config.cjs`.
- Consolidación: una única interfaz `BaseElement` en `src/domain/element/element-types.ts` como contrato de la unión discriminada; eliminada la clase abstracta (abstracción especulativa).
- `TaskStatus` convertido en unión literal (`'todo' | 'in_progress' | 'done'`) y aplicado a `TaskElement.status`.
- Corregida la inversión de capas: `src/domain/shared/index.ts` ya no re-exporta `../element`.
- Tests reescritos sin `any` ni casts en `src/test/unit/domain/element/element-types.test.ts` (convención `src/test/unit/domain/**`); datos no confiables se simulan con `Object.assign` sobre factories tipadas.
- Quality gates: `lint`, `format:check`, `tsc -b --noEmit`, `test` (601 tests) y `build` en verde.
- Sin ADR nuevo: no hay decisión arquitectónica significativa.
