# ADR-0025: Estrategia de accesibilidad del canvas

**Fecha:** 2026-10-14
**Estado:** Aceptado

## Contexto

El canvas es una superficie infinita con pan/zoom, selección y multiselección, y seis tipos de elemento (text, note, task, frame, connector, link). TASK-109 y TASK-110 cerraron la navegación espacial por teclado, el foco del canvas, el roving tabindex de la toolbar y el `aria-activedescendant`, y **dejaron explícitamente para TASK-111 los nombres/roles accesibles por elemento** y la definición de una estrategia.

Restricciones y hechos relevantes:

- El contenedor es `role="application"` con `tabIndex={0}`, `aria-label="Canvas"`, `aria-readonly`, `aria-keyshortcuts`, `aria-grabbed` y `aria-activedescendant` apuntando a `element-<id>`.
- Los renderers pintan contenido **visual** (texto, título, estado, url, línea de connector); los connectors ya eran `aria-hidden`.
- El modelo de interacción es "modo aplicación": el foco vive en el contenedor y el elemento activo se comunica con `aria-activedescendant` (no hay foco por elemento).
- Domain/Application no deben depender de React; Presentation concentra UI y textos.
- No hay directorio de usuarios ni datos adicionales para nombrar elementos más allá de sus propios campos.

Lo que faltaba: los elementos no se anunciaban (ni rol ni nombre), el connector no tenía alternativa textual y no existía una descripción global del tablero.

## Decisión

1. **El canvas se mantiene como `role="application"`** con foco propio y `aria-activedescendant`, patrón estándar para editores de canvas. No se introduce `listbox`/`grid` (implicaría un modelo de selección/foco que no coincide con el canvas real).

2. **Cada elemento es un `role="group"` con nombre accesible explícito.** `ElementView` (`src/presentation/canvas/renderers/element-view.tsx`) añade `role="group"` y `aria-label`, y expone la selección con `aria-current="true"` (atributo global; `aria-selected` no es válido sobre `group`). El grupo es el nodo referenciado por `aria-activedescendant`, y al ser "hoja" de contenido se evita ambigüedad.

3. **El nombre accesible se calcula con una función pura y React-free** `describeElement(element, elements?)` (`src/presentation/canvas/accessibility/describe-element.ts`), en Presentation por tratarse de textos de UI. Devuelve etiquetas legibles por tipo (`Text: …`, `Note: …`, `Task: <título>, <estado>[, due <fecha>]`, `Frame: …`, `Link: …`, `Connector from … to …`), normaliza espacios y **trunca** el contenido largo. Para connectors, si se pasa el tablero, resuelve los extremos a la etiqueta del elemento referenciado en lugar de exponer ids. Se testea de forma determinista sin DOM.

4. **El contenido visual de los renderers es decorativo para AT.** Se marca `aria-hidden="true"` en la raíz de cada renderer (los connectors ya lo estaban). Así el lector de pantalla usa el nombre conciso del grupo y no relee el contenido visual de forma duplicada o desordenada.

5. **Alternativa textual mínima del tablero.** `describeBoard(elements)` (misma utilidad pura) produce un resumen escalable por tipo (`Board with N elements: 1 text, 1 note…`; `This board is empty.`) que se renderiza en un `VisuallyHidden` con `id="canvas-board-summary"` y se enlaza con `aria-describedby` en el contenedor. Es mínimo (no lista cada elemento) y no depende del tamaño del tablero.

6. **Cobertura de teclado de las operaciones principales.** Se reutiliza lo ya implementado en TASK-109/110 (navegación y selección con flechas, extensión con `Shift`, `Esc`, `Ctrl/Cmd+A`, `Delete`, `Ctrl/Cmd+D/C/V/Z/Shift+Z/Y`) y los controles de vista accesibles por teclado (`Fit view` en la toolbar, `Reset view` y zoom % en `viewport-controls`). Los gestos de puntero (space+drag, ctrl+wheel) quedan como **atajos de eficiencia**, no como el único camino: no se introducen bindings nuevos en esta tarea.

## Alternativas consideradas

- **`role="listbox"` + `role="option"` con `aria-selected`:** rechazada; fuerza una semántica de lista/composite que no representa la selección múltiple ni la ausencia de foco por ítem del canvas, y complica `aria-activedescendant` sobre `role="application"`.
- **No poner `aria-label` y dejar que el contenido visual nombre al elemento:** rechazada; los connectors no tienen texto y task/frame/link requieren una composición estructurada y corta (estado, due, url). El nombre explícito es consistente y controlable.
- **Anunciar el tablero con `aria-live`:** rechazada; un resumen que cambia en cada edición produce ruido. `aria-describedby` se lee al enfocar el canvas y es estable.
- **Listar todos los elementos en el resumen:** rechazada; deja de ser "mínimo" y no escala. El desglose por tipo es suficiente para orientar.
- **Añadir atajos nuevos de nudge/zoom por teclado:** rechazada en esta tarea por acuerdo de alcance; quedaría como tarea futura si se demuestra necesidad.

## Consecuencias

- Los elementos se anuncian con nombre y estado correctos, los connectors tienen alternativa textual y el tablero ofrece un resumen para lectores de pantalla.
- La lógica de nombres es pura y testeable (`describe-element.test.ts`), y el cambio en `ElementView`/renderers es de atributos de accesibilidad, sin tocar la interacción ni la persistencia.
- Ninguna capa no-Presentation se modifica; Domain/Application/Infrastructure permanecen intactos.
- La accesibilidad **efectiva** sigue requiriendo validación con lectores de pantalla reales; reduced motion/contrast se abordan en TASK-112.
- Tests nuevos: `describe-element.test.ts`, y assertions de rol/nombre/estado en `element-view.test.tsx` y de resumen/`aria-describedby` en `canvas.test.tsx`.
