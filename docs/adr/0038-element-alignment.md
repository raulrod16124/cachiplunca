# ADR-0038: Alineación y distribución de la selección (PBL-012)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-012 — Alineación y distribución (`docs/post-mvp-backlog.md`)

## Contexto

El canvas permite mover y redimensionar elementos, pero organizar una selección múltiple exige hacerlo a mano. PBL-012 pide operaciones geométricas predecibles para alinear (2+ elementos) y distribuir (3+ elementos), reutilizando el movimiento, el historial y la persistencia existentes, sin añadir dependencias ni entidades.

Los conectores no son buenos candidatos para estas operaciones: los conectores ligados derivan su geometría de los elementos extremo, y los conectores libres guardan sus extremos como `sourcePoint`/`targetPoint`, por lo que cambiar solo `position` no los movería visualmente.

## Decisión

1. **Lógica pura en Application.** `alignElements(elements, ids, mode, deps?)` y `distributeElements(elements, ids, axis, deps?)` viven en `src/application/services/element-alignment.ts`, reciben `Element[]` y devuelven `Element[]` sin mutar la entrada. Usan `createMoveElement` para cada posición y un reloj inyectable (`now`) para tests deterministas.

2. **Referencia de alineación = bounding box de la selección.** Izquierda, centro horizontal, derecha, arriba, centro vertical y abajo se calculan con `Bounds.union` de los elementos elegibles. Solo cambia `position`; `size`, `rotation`, `zIndex` y el resto de campos se conservan.

3. **Distribución por huecos iguales entre bordes.** Los elementos se ordenan por `left`/`top` (desempate por `id`) y el primero y el último quedan fijos. Los intermedios se colocan para que el espacio entre bordes consecutivos sea el mismo. Si el ancho total supera el tramo, el hueco puede ser negativo (solapamiento), igual que en herramientas de diseño habituales.

4. **Conectores excluidos.** La selección elegible filtra `isConnectorElement`; si quedan menos de 2 elementos, alinear no hace nada, y si quedan menos de 3, distribuir no hace nada. La UI refleja esos umbrales.

5. **Sin operaciones no-op en el historial.** Si ninguna posición cambia, la función devuelve la misma referencia del array de entrada. `commitElements` ya ignora esa referencia, evitando entradas de undo vacías.

6. **Un solo paso de historial y la persistencia existente.** `Canvas` calcula el resultado y notifica `onAlignElements`/`onDistributeElements`; el contenedor los persiste con `commitElements(next, 'Align elements' | 'Distribute elements')`. Así se heredan el historial, el undo/redo, la persistencia optimista, el flush y la reconciliación remota sin duplicar lógica.

7. **UI en la toolbar.** Un único desplegable “Alinear y distribuir” en `CanvasToolbar` agrupa las 6 alineaciones y las 2 distribuciones con `DropdownMenu` de `@raulrod/ui`, iconos decorativos y etiquetas i18n. El trigger se deshabilita con menos de 2 elementos elegibles o en solo lectura; las distribuciones se marcan `aria-disabled` con menos de 3. No se añaden atajos nuevos ni acciones a la command palette.

## Alternativas consideradas

- **Menú contextual en lugar de toolbar:** rechazado; el menú contextual parte de un elemento y la operación es de selección múltiple. La toolbar es más descubrible y mantiene el foco en el canvas.
- **Distribución por centros:** rechazada; iguala centros aunque los tamaños difieran, lo que produce huecos visualmente desiguales. Huecos iguales es la expectativa en herramientas de diseño.
- **Incluir conectores:** rechazado; los conectores ligados se moverían de forma inconsistente y los libres no moverían sus extremos.
- **Nuevo comando de historial específico:** rechazado; `commitElements` + `createBoardWindowCommand` ya modela un cambio de ventana de elementos y evita duplicar undo/redo.
- **Persistir el resultado con `persistElements` y cerrar gesto después:** rechazado; una alineación es una acción discreta, no un gesto de arrastre. `commitElements` genera una única entrada de historial y hace flush inmediato.
- **Botones sueltos en la toolbar:** rechazado; 8 botones adicionales saturan la barra y complican el roving focus.

## Consecuencias

- Alinear y distribuir son operaciones puras, testeadas y deterministas; solo modifican posiciones.
- La selección mixta con conectores funciona: se mueven los elementos no conector y los conectores no se tocan.
- Undo/redo revierten la operación completa en un paso y la persistencia usa el flujo existente.
- La toolbar gana un desplegable accesible; no hay cambios de dominio, reglas, infraestructura ni dependencias.
- Los elementos ya alineados no generan ruido en el historial.
