# ADR-0035: Command palette scoped y facade de comandos del canvas (PBL-008)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-008 — Command palette (Cmd/Ctrl + K) (`docs/post-mvp-backlog.md`)

## Contexto

El producto ya tenía comandos dispersos entre la top bar, la toolbar del canvas, el diálogo de atajos y la lista de workspaces. PBL-008 pedía un único punto de descubrimiento y navegación con `Cmd/Ctrl + K`, sin duplicar la lógica existente ni introducir nuevas pantallas o dependencias.

El canvas concentra estado y handlers que no son triviales de replicar desde fuera: la creación de tareas abre un formulario, la edición inline se activa al crear ciertos elementos, el fit depende de las bounds visibles y undo/redo usan el historial del board. Reimplementar esas acciones desde la palette habría creado dos fuentes de verdad y regresiones sutiles.

## Decisión

1. **Un componente reutilizable `CommandPalette`.** Vive en `presentation/components/command-palette` y compone `Dialog` + `Input` de `@raulrod/ui`. Implementa el patrón combobox/listbox con `aria-activedescendant`, navegación por flechas/Home/End/Enter, anuncio `aria-live` del número de resultados y foco inicial en el input.

2. **Listener de teclado scoped a cada host.** `useCommandPaletteShortcut` se monta en la página de workspaces o en el layout del board, nunca como event bus global. Ignora inputs, editores y modales abiertos; cuando la palette está abierta, `Cmd/Ctrl + K` la cierra.

3. **`CanvasCommandHandle` como facade de presentación.** `Canvas` expone un handle imperativo mínimo con `createElement`, `createConnector` (libre y ligado), `fitView`, `undo`, `redo` y `focusElement`. Cada método delega en el handler interno ya existente, de modo que la palette replica exactamente el comportamiento de la toolbar, el formulario de tareas, el historial y el viewport.

4. **Búsqueda pura y acotada.** `searchElements` vive en Application, usa `richTextToPlain` por tipo y normaliza mayúsculas/diacríticos; excluye conectores y limita resultados. La búsqueda de workspaces por nombre es pura en Presentation y carga `ListWorkspaces` bajo demanda al abrir la palette. No se añaden stores ni entidades.

5. **Centrar resultados sin cambiar el zoom.** `Viewport.center(bounds)` y `CanvasViewportStore.center(bounds)` centran las bounds manteniendo la escala. La palette selecciona el elemento y centra el viewport reutilizando esa operación.

6. **Acciones disponibles según contexto.** En solo lectura no aparecen las acciones de escritura; undo/redo se muestran deshabilitadas cuando no aplican. La ayuda de atajos de PBL-004 se incorpora como acción del board. "Connect selected elements" solo aparece con exactamente dos elementos no-conector seleccionados.

## Alternativas consideradas

- **Elevar todo el estado del canvas al layout:** rechazado; obliga a mover el formulario de tareas, la edición inline y el historial, con alto riesgo de regresión y sin beneficio para la palette.
- **Duplicar las acciones dentro de la palette:** rechazado; crea dos fuentes de verdad para creación, fit y undo/redo.
- **Event bus global:** rechazado por el propio alcance del backlog; complica el ciclo de vida y puede abrir la palette desde pantallas no autorizadas.
- **Dependencia externa de command palette:** rechazada; `Dialog`/`Input` y un listbox propio cubren el caso sin añadir peso ni estilos ajenos.
- **Búsqueda difusa o IA:** fuera de alcance; substring normalizado es predecible y testeable.

## Consecuencias

- La palette funciona igual en Workspaces y en el board, con el mismo contrato visual y de teclado.
- Los comandos del canvas siguen teniendo una sola implementación; el facade es la frontera explícita entre palette y canvas.
- `CanvasCommandHandle` queda disponible para futuras acciones de shell (PBL-009 podrá reutilizar `focusElement`/`center`).
- No hay cambios de persistencia, rules, dominio de elementos ni dependencias.
- Los tests cubren helpers puros, el componente, los flujos de board/workspaces y un journey E2E.
