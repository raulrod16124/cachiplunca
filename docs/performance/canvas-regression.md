# Canvas performance regression (TASK-115)

**Estado:** vigente · **Fecha:** 2026-10-15 · **Tarea:** TASK-115 (`docs/mvp-backlog.md`)
**Base:** `docs/performance/canvas-optimization.md` (TASK-114) · **ADR:** `docs/adr/0027-performance-regression-testing.md`

Este documento define cómo se protege la optimización de render de TASK-114 frente a
regresiones. La estrategia es **híbrida**: un guard estructural determinista que sí
falla de forma fiable en `npm test`, y un conjunto de presupuestos absolutos y
holgados que solo fallan ante regresiones catastróficas en `npm run perf`.

## Por qué dos capas

Los tiempos medidos con jsdom dependen del host y de la carga del sistema. Usar
solo umbrales de tiempo como guard haría la suite frágil (falsos positivos en
máquinas lentas) o inútil (umbrales tan holgados que no detectan regresiones). Por
eso:

1. **Guard primario — estructural (determinista, en `npm test`).** Verifica la
   _invariante_ que produce la mejora: solo se montan los `ElementView` que
   intersectan el área visible. No mide tiempo, así que es estable en cualquier
   máquina y falla siempre que se elimine o degrade el culling.
2. **Guard secundario — presupuestos absolutos (en `npm run perf`).** Registra
   _techo_ de tiempo/memoria con holgura de ~1–2 órdenes de magnitud sobre el valor
   optimizado. Detecta regresiones catastróficas (p. ej. volver a re-renderizar todo)
   sin ser sensible a la varianza normal.

## Capa 1 — Guard estructural

`src/test/unit/presentation/canvas/components/canvas-render-budget.test.tsx`
(se ejecuta en `npm test`, suite funcional):

- **Contrato exacto de montaje:** para un tablero de 8.000 elementos y viewport de
  1280×800, el número de nodos `[data-selectable]` montados es exactamente
  `getVisibleElementIds(items, visibleWorld, CULLING_MARGIN).length`, y muy inferior
  a N. Si el culling desaparece, se montan N nodos y el test falla.
- **Independencia del tamaño del tablero:** con un cluster fijo visible y 10 vs 5.000
  elementos lejanos, el número de nodos montados es **el mismo** (el coste depende
  del área visible, no de N).
- **Interacción:** tras `pan`, `zoom` y `selection`, el número de nodos montados
  sigue siendo el de la ventana visible.
- **Fuera de vista:** pan a una zona vacía ⇒ **cero** nodos montados.

`CULLING_MARGIN` se exporta desde `src/presentation/canvas/components/canvas.tsx`
para que el test afirme el contrato real en lugar de duplicar la constante.

## Capa 2 — Presupuestos absolutos

- `src/test/perf/budgets.ts`: tabla `CANVAS_PERFORMANCE_BUDGETS` + evaluador puro
  `evaluateBudgets(metrics, budgets)` (devuelve violaciones `exceeded`/`missing`).
- `src/test/perf/canvas.regression.perf.test.tsx`: mide los escenarios presupuestados
  a 10.000 elementos y falla si algún `median` supera su techo.
- `src/test/perf/budgets.perf.test.ts`: tests puros del evaluador (líneas base,
  superación, ausencia, no-finitos).

Te y valor optimizado de referencia (TASK-114):

| Métrica                         |    Techo | Ref. optimizada | Holgura aprox. | Ref. línea base |
| ------------------------------- | -------: | --------------: | -------------: | --------------: |
| `render:mount@10000`            | 1.200 ms |         ~126 ms |           ~10x |          755 ms |
| `render:pan@10000`              |   120 ms |         ~1,6 ms |           ~75x |          398 ms |
| `render:zoom@10000`             |   120 ms |         ~1,6 ms |           ~75x |          470 ms |
| `render:selection@10000`        |   120 ms |         ~7,7 ms |           ~16x |          407 ms |
| `render:heap@10000`             |   120 MB |        ~11,9 MB |           ~10x |         ~262 MB |
| `toSelectableItems@10000`       |    60 ms |         ~2,7 ms |           ~22x |               — |
| `findSelectableAt@10000`        |    20 ms |        ~0,02 ms |         ~1000x |               — |
| `findSelectablesInBounds@10000` |    60 ms |        ~0,05 ms |         ~1000x |               — |
| `describeBoard@10000`           |    40 ms |         ~0,3 ms |          ~130x |               — |
| `elementContentBounds@10000`    |    60 ms |         ~4,5 ms |           ~13x |               — |

Los techos de interacción quedan **por debajo** de la línea base de TASK-113 y muy
por encima del valor optimizado: una regresión al comportamiento previo (re-render
de todo) falla, mientras que la varianza normal pasa. Los techos de `mount` y de los
algoritmos son holgados a propósito (guard de cordura); la regresión del culling la
detecta la Capa 1 y los techos de `pan`/`zoom`/`selection`.

## Ejecución

- Guard estructural: `npm test` (sin coste perceptible, ~0,35 s).
- Presupuestos: `npm run perf` (mide también la línea base de TASK-113/114).

## Limitaciones

- Los presupuestos son **mismo-host**; no son verdades absolutas ni aptos para CI
  multi-host sin recalibrar.
- jsdom no pinta: miden reconciliación/DOM y memoria del heap de Node, no FPS ni
  layout/paint reales (para eso, harness manual `npm run perf:dev`).
- Los `it` de rendimiento se ejecutan en serie (`--runInBand`) para no contaminar las
  mediciones.
