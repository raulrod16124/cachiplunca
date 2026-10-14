# Canvas performance baseline (TASK-113)

**Estado:** vigente · **Regenerado:** 2026-10-14 · **Tarea:** TASK-113 (`docs/mvp-backlog.md`)
**Método:** `npm run perf` (jsdom) + harness manual de navegador (`npm run perf:dev`)
**Artefacto:** `docs/performance/canvas-baseline.json` (regenerado con `PERF_WRITE=1 npm run perf`)

Este documento es un **registro de medición**, no de optimización. Su único fin es
dar datos reproducibles para justificar TASK-114 (Rendering optimization) y los
umbrales de regresión de TASK-115. No se cambia código de producción.

## Cómo medir

```bash
# Línea base reproducible (jsdom). Con --expose-gc para una memoria fiable.
npm run perf

# Regenera el artefacto JSON versionado.
PERF_WRITE=1 npm run perf

# Harness manual de navegador (métricas reales de layout/paint/FPS).
npm run perf:dev   # abre http://localhost:5173/perf.html
```

- `npm run perf` ejecuta `jest.perf.config.cjs` (aislado de `npm test`, que ignora
  `src/test/perf`). Escenarios de **100 / 1.000 / 5.000 / 10.000** elementos.
- El tablero se genera de forma **determinista** (`generateElements`, semilla fija)
  mezclando los seis tipos de elemento.
- La interacción se ejercita con los **stores en memoria** (`createCanvasViewportStore`,
  `createSelectionStore`); nunca se tocan repositorios ni persistencia.

## Entorno de la última captura

| Campo         | Valor                  |
| ------------- | ---------------------- |
| Node          | v23.6.0                |
| Plataforma    | darwin / arm64         |
| CPU           | Apple M2 Max (12 vCPU) |
| Memoria total | 65.536 MB              |
| Runner        | jsdom · `--expose-gc`  |

Las cifras dependen de la máquina; sirven para **comparar ejecuciones en el mismo host**.

## Algoritmos del hot path (mediana, ms)

Funciones puras que se ejecutan en render, selección y accesibilidad.

| Escenario                               |   100 | 1.000 | 5.000 | 10.000 |
| --------------------------------------- | ----: | ----: | ----: | -----: |
| `toSelectableItems`                     | 0,027 | 0,261 | 1,339 |  2,685 |
| `findSelectableAt` (miss total)         | 0,004 | 0,008 | 0,015 |  0,023 |
| `findSelectablesInBounds` (todo dentro) | 0,011 | 0,034 | 0,174 |  0,054 |
| `describeBoard`                         | 0,009 | 0,027 | 0,126 |  0,293 |
| `describeElement` (connector)           | 0,001 | 0,001 | 0,002 |  0,001 |
| `elementContentBounds`                  | 0,068 | 0,533 | 2,230 |  4,502 |

`toSelectableItems` y `elementContentBounds` son **lineales** y baratos en absoluto
(< 5 ms a 10.000). El aparente mejor resultado de `findSelectablesInBounds` a 10.000
frente a 5.000 es ruido de JIT/GC con pocas muestras, no una mejora real.

## Interacción: re-render del canvas (mediana, ms)

`<Canvas>` montado con N elementos; cada muestra es una actualización de store
envuelta en `act` (pan/zoom/selección) o un montaje/desmontaje completo (`mount`).

| Escenario                  |     100 |    1.000 |     5.000 |    10.000 |
| -------------------------- | ------: | -------: | --------: | --------: |
| `mount` (render + commit)  |   16,99 |    71,30 |    349,85 |    755,28 |
| `pan`                      |    9,62 |    28,90 |    208,40 |    398,26 |
| `zoom`                     |    4,00 |    27,90 |    165,80 |    470,48 |
| `selection`                |    4,35 |    32,06 |    183,42 |    406,72 |
| `heap` (delta tras montar) | ~9,1 MB | ~31,7 MB | ~136,1 MB | ~262,3 MB |

## Hallazgos (a consumir por TASK-114)

1. **La interacción no escala linealmente.** Pan/zoom/selección pasan de ~4–10 ms
   a 100 elementos a ~160–470 ms a 5.000–10.000: por encima de 1.000 el coste crece
   más rápido que el número de elementos. La causa observable es que cada cambio de
   viewport/selección **re-renderiza todos los `ElementView` y recalcula `items`,
   `allIds`, `selectedItems` y los `aria-label`**. A 10.000 el frame queda muy por
   encima del presupuesto de 16 ms.
2. **El montaje inicial es el escenario más caro** (~755 ms a 10.000), consistente
   con construir 10.000 subárboles de styled-components de una vez.
3. **La memoria crece ~linealmente** (~26 KB/elemento), dominada por nodos DOM,
   estilos y objetos de elemento. Sin fugas evidentes (el delta es proporcional).
4. **Los algoritmos puros no son el cuello de botella** a estas escalas; el coste
   está en el render de React/DOM, no en hit-test, bounds o descripciones.

## Limitaciones

- **jsdom no pinta.** Estos números miden reconciliación y construcción de DOM, no
  layout/paint reales. El **harness de navegador** (`npm run perf:dev`) cubre FPS,
  long tasks y `performance.memory` sobre el canvas real, pero es **manual** (no hay
  CI en el repo) y sus cifras no se versionan aquí.
- **Ausencia de presupuestos.** TASK-113 solo registra; ningún test falla por lentitud.
  Los umbrales de regresión llegan en TASK-115 y la optimización en TASK-114.
- Pocas muestras a 5.000/10.000 (1–3) por el coste de montar tableros grandes; las
  medianas son indicativas y el JSON conserva `min/mean/p95/max`.
- La memoria se mide con `--expose-gc`: es orientativa, no un perfil de asignaciones.
