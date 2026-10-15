# Canvas rendering optimization (TASK-114)

**Estado:** vigente · **Fecha:** 2026-10-15 · **Tarea:** TASK-114 (`docs/mvp-backlog.md`)
**Base:** `docs/performance/canvas-baseline.md` (TASK-113) · **Método:** `npm run perf` (jsdom)

Este documento registra la optimización de render justificada por la línea base de
TASK-113 y sirve de referencia para los umbrales de regresión de TASK-115.

## Diagnóstico (TASK-113)

La medición mostró que el coste no estaba en los algoritmos puros (< 5 ms a 10.000
elementos) sino en el **render de React/DOM**: cada cambio de viewport o selección
re-renderizaba **todos** los `ElementView` y recalculaba `aria-label`
(`describeElement`) para el tablero completo. A 10.000 elementos pan/zoom/selección
rondaban 400–470 ms y el montaje ~755 ms.

## Cambios

1. **Culling por viewport (presentation + application).**
   - Nueva función pura `getVisibleElementIds(elements, visibleWorld, margin)` en
     `src/application/services/canvas-visibility.ts` (sin React ni APIs del navegador).
   - `<Canvas>` calcula el área visible en coordenadas de mundo y solo monta los
     `ElementView` que intersectan esa área (margen de 64 unidades de mundo para
     evitar parpadeo en los bordes). La selección, el hit-test y el marquee siguen
     operando sobre **todos** los elementos (`items`), no sobre los visibles.

2. **Tamaño real del contenedor (presentation).**
   - Nuevo hook `useElementSize` (`ResizeObserver` + `getBoundingClientRect`) que
     devuelve `null` hasta medir un tamaño no vacío. `<Canvas>` usa el tamaño medido
     y, si no está disponible (p. ej. jsdom, que no hace layout), cae al
     `viewport.size` del store. Así el culling nunca recorta elementos visibles en
     un contenedor responsive ni en los tests.

3. **`ElementView` memoizado (presentation).**
   - `memo(ElementViewComponent)` para evitar re-render cuando `element`, `selected`,
     `renderers`, `ariaLabel` y `zIndex` no cambian.
   - El objeto `style` se memoiza con `useMemo` sobre sus campos primitivos.
   - `contain: layout paint` en el `Wrapper` para aislar el coste de layout/paint.

4. **`aria-label` memoizado (presentation).**
   - `<Canvas>` construye un `Map<id, ariaLabel>` con `useMemo` dependiente solo de
     `elements`, de modo que `describeElement` no se recalcula en pan/zoom/selección.
     `aria-label="Canvas"` y el label por elemento se conservan intactos.

## Resultados

Mediana a 10.000 elementos (jsdom, mismo host que la línea base). Menos es mejor.

| Métrica     | Línea base (TASK-113) | Optimizado | Mejora |
| ----------- | --------------------: | ---------: | ------ |
| `mount`     |             755,28 ms |  125,81 ms | ~6x    |
| `pan`       |             398,26 ms |    1,60 ms | ~249x  |
| `zoom`      |             470,48 ms |    1,57 ms | ~300x  |
| `selection` |             406,72 ms |    7,72 ms | ~53x   |
| `heap`      |             ~262,3 MB |   ~11,9 MB | ~22x   |

A 100/1.000/5.000 elementos las cifras también quedan por debajo de la línea base;
la mejora crece con el tamaño porque el número de elementos montados ya no depende
del tamaño del tablero, solo del área visible.

## Cobertura de tests

- `src/test/unit/presentation/canvas/components/canvas-culling.test.tsx`: solo se
  montan los elementos visibles; reaparecen al hacer `fit`; el hit-test/selección
  siguen viendo los elementos culled.
- `src/test/unit/presentation/canvas/hooks/use-element-size.test.tsx`: estado nulo
  sin layout, medición inicial, actualización por `ResizeObserver` y limpieza.
- `src/test/unit/application/services/canvas-visibility.test.ts`: casos límite del
  culling (parcial, fuera, margen).

## Limitaciones

- jsdom no pinta: los números miden reconciliación/DOM. La validación de layout/paint
  real sigue siendo el harness manual (`npm run perf:dev`).
- El `contain: layout paint` puede recortar overflow visual fuera del box del
  elemento; los renderers actuales dibujan dentro de su `size`.
- El culling usa el tamaño medido del contenedor; sin `ResizeObserver` disponible se
  recalcula solo en montaje/re-render, no ante resize continuo.
