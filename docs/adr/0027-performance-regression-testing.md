# ADR-0027: Estrategia de test de regresión de rendimiento

**Fecha:** 2026-10-15
**Estado:** Aceptado

## Contexto

TASK-113 midió una línea base del canvas y TASK-114 la optimizó con culling por
viewport: a 10.000 elementos pan/zoom/selección pasaron de ~400–470 ms a ~1,6–7,7 ms
y el heap de ~262 MB a ~11,9 MB. TASK-115 debe **proteger** ese resultado frente a
regresiones.

Hechos y restricciones relevantes:

- No hay CI (`.github/workflows/` no existe) y no se prevé. El runner de tests es
  Jest 29 en jsdom con `--runInBand`.
- `npm run perf` (`jest.perf.config.cjs`, `tsconfig.perf.json`) mide en jsdom, que
  **no pinta**: los números de tiempo dependen del host y de la varianza del sistema
  operativo/JIT. El propio baseline advierte que son para comparación mismo-host.
- `npm test` ignora `src/test/perf`; la suite funcional no debe pagar el coste de los
  benchmarks.
- Domain/Application no dependen de React ni de APIs del navegador; Presentation
  concentra React/UI. El tooling de tests no debe romper esas fronteras.

Un guard basado **solo** en umbrales de tiempo sería frágil: en una máquina lenta o
con carga daría falsos positivos, y si se afloja demasiado no detectaría la
regresión real (volver a montar/re-renderizar todo el tablero).

## Decisión

1. **Guard primario: invariante estructural determinista en `npm test`.**
   Nuevo `src/test/unit/presentation/canvas/components/canvas-render-budget.test.tsx`
   que, con `generateElements` (semilla fija) y viewport controlado, afirma:
   - el número de nodos `[data-selectable]` montados **es igual** a
     `getVisibleElementIds(items, visibleWorld, CULLING_MARGIN).length` y muy inferior
     a N;
   - montar un tablero mayor no aumenta los nodos montados para el mismo viewport;
   - `pan`/`zoom`/`selection` no montan elementos fuera del viewport;
   - pan a una zona vacía ⇒ cero nodos montados.
     Para afirmar el contrato real (sin duplicar la constante) se **exporta**
     `CULLING_MARGIN` desde `canvas.tsx`. Es el único cambio de producción: exportar una
     constante ya existente.

2. **Guard secundario: presupuestos absolutos y holgados en `npm run perf`.**
   - `src/test/perf/budgets.ts`: tabla `CANVAS_PERFORMANCE_BUDGETS` y evaluador puro
     `evaluateBudgets`/`isWithinBudget` (sin dependencias de dominio).
   - `src/test/perf/canvas.regression.perf.test.tsx`: mide a 10.000 elementos y falla
     si un `median` supera su techo. Techos entre el valor optimizado y la línea base
     (p. ej. `pan@10000 ≤ 120 ms`, `heap@10000 ≤ 120 MB`), con holgura ~10–75x.
   - `src/test/perf/budgets.perf.test.ts`: tests puros del evaluador.
     `canvas.perf.test.tsx` se deja **intacto** (sigue siendo solo medición).

3. **Ubicación por capas.** El guard estructural vive en la suite funcional
   (`src/test/unit/**`, Presentation) reutilizando la infra de test existente; los
   presupuestos viven en el tooling de perf (`src/test/perf/**`, type-checkeado por
   `tsconfig.perf.json`). No se introduce tooling nuevo ni dependencias.

## Alternativas consideradas

- **Solo umbrales de tiempo (sin guard estructural):** rechazada; frágil ante el host
  y fácil de aflojar hasta ser inútil, en un proyecto sin CI multi-host.
- **Solo guard estructural (sin presupuestos):** rechazada; detecta la regresión de
  algoritmo/montaje pero no una degradación de tiempo o memoria no estructural
  (p. ej. un `useMemo` que deja de memoizar).
- **Umbrales relativos contra el baseline commiteado:** rechazada; el baseline es de
  otro host/otra ejecución y comparar números absolutos entre hosts es ruido.
- **Snapshot de tiempos / `expect(result).toMatchSnapshot()`:** rechazada; los tiempos
  cambian en cada ejecución, el snapshot sería inestable.
- **Añadir una dependencia de benchmarking (tinybench, etc.):** rechazada en ADR-0026
  y sigue sin necesidad; el evaluador puro `budgets.ts` cubre el caso.
- **Montar todo el tablero y contar `render` callbacks:** rechazada; el número de
  nodos DOM montados ya es una señal observable, directa y estable.

## Consecuencias

- Una regresión que reintroduzca el re-render de todo el tablero **rompe `npm test`**
  de forma fiable (Capa 1), sin depender de la máquina.
- Una regresión no estructural pero catastrófica de tiempo/memoria **rompe
  `npm run perf`** (Capa 2), con holgura suficiente para no ser flaky.
- `npm test` no cambia su coste de forma perceptible (~0,35 s del guard estructural);
  el guard de tiempo solo corre en `npm run perf`.
- Los techos siguen siendo mismo-host; recalibrarlos requiere una nueva medición
  (`docs/performance/README.md`).
- Sin nuevas dependencias ni tooling; el evaluador de presupuestos es una función pura
  y testeada.
