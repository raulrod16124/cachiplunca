# ADR-0026: Línea base de rendimiento del canvas

**Fecha:** 2026-10-14
**Estado:** Aceptado

## Contexto

El canvas maneja pan/zoom, selección y multiselección sobre tableros que pueden
crecer a miles de elementos de seis tipos. El backlog exige **medir una línea base
antes de optimizar** y justificar cualquier optimización con datos (TASK-114) y
protegerla con umbrales (TASK-115).

Hechos y restricciones relevantes:

- **No existía tooling de rendimiento**: ni benchmarks, ni `performance.now`/
  `Profiler`, ni CI (no hay `.github/workflows/`). Únicamente tres `will-change:
transform` en CSS y la dependencia transitiva `@firebase/performance`.
- El stack es React 19 + styled-components 6 + Vite 8, con Jest 29 (`--runInBand`)
  como runner y `tsconfig` por capas (`app`, `node`, `rules`).
- La interacción debe permanecer **desacoplada de la persistencia**.
- Domain/Application no dependen de React ni de APIs del navegador; Presentation
  concentra UI. La optimización no debe filtrarse a capas internas.

## Decisión

1. **Doble capa de medición.** (a) Suite Jest reproducible en jsdom
   (`src/test/perf/canvas.perf.test.tsx`) que mide reconciliación/DOM y algoritmos
   con semilla fija; (b) **harness manual de navegador** (`perf.html` →
   `src/test/perf/browser/main.tsx`) que monta el `<Canvas>` real y mide
   frames/long tasks/paint, donde jsdom no llega.

2. **Escenarios y métricas.** 100/1.000/5.000/10.000 elementos; se miden `mount`,
   `pan`, `zoom`, `selection`, `heap` y los algoritmos del hot path
   (`toSelectableItems`, `findSelectableAt`, `findSelectablesInBounds`,
   `describeBoard`, `describeElement`, `elementContentBounds`). Se reportan
   `min/median/mean/p95/max` con warmup adaptativo al tamaño.

3. **Registro versionado.** El artefacto canónico es
   `docs/performance/canvas-baseline.json` (regenerado con `PERF_WRITE=1 npm run perf`)
   y su lectura humana en `docs/performance/README.md`. No se commitean cifras del
   harness de navegador (dependen de la máquina/el navegador).

4. **Aislamiento del tooling.** Nueva config `jest.perf.config.cjs` (extiende la
   principal) + script `npm run perf` (con `--expose-gc` para una memoria fiable) y
   proyecto `tsconfig.perf.json` para type-check estricto del código Node-only.
   `npm test` **ignora** `src/test/perf`, de modo que la suite funcional no paga el
   coste de los benchmarks.

5. **Sin cambios de producción.** El harness reutiliza `Canvas` y los stores en
   memoria; `perf.html` no forma parte de `npm run build` (Vite solo construye
   `index.html`). No se toca Domain/Application/Infrastructure ni la Presentation
   de producción.

## Alternativas consideradas

- **Solo jsdom:** rechazada; no mide layout/paint/FPS reales, precisamente el coste
  sospechoso a gran escala.
- **Solo harness de navegador:** rechazada; no es reproducible ni automatizable, no
  puede fallar ni compararse en `npm run perf`, y no hay CI que lo consuma.
- **Dependencia de benchmarking de terceros (p. ej. `vitest bench`/`tinybench`):**
  rechazada; introduciría una dependencia y un segundo runner sin necesidad, con el
  riesgo de que no integre el entorno jsdom/styled-components del proyecto.
- **Commitear también las cifras del navegador:** rechazada; son específicas del host
  y añaden ruido sin valor de regresión.
- **Medir con presupuestos ya en esta tarea:** rechazada por alcance; TASK-113 solo
  registra, los umbrales son TASK-115.

## Consecuencias

- Existe una línea base reproducible y un harness manual, y quedan datos que
  justifican TASK-114: la interacción **no escala linealmente** (a 10.000 elementos
  pan/zoom/selección rondan 400–470 ms y el montaje ~755 ms), mientras que los
  algoritmos puros son lineales y baratos (< 5 ms). El coste está en el render de
  React/DOM, no en el hit-test ni en las descripciones.
- El coste de `npm test` no cambia (perf excluido); el tooling queda type-checkeado
  por `tsc -b` vía `tsconfig.perf.json`.
- La memoria de jsdom es orientativa; la medición fiable de pintura queda en el
  harness manual, que no es parte de la CI.
- Los números dependen de la máquina: el JSON y el documento son para comparación
  **mismo-host**, no verdades absolutas.
