# Canvas performance

The canvas is the most demanding part of the UI: it can hold thousands of
elements while pan, zoom, selection and collaboration updates stay responsive.
Performance is protected by two complementary guards.

## Strategy

1. **Structural guard (primary).** Runs in `npm test` and verifies the invariant
   that makes large boards fast: only elements intersecting the visible viewport
   are mounted. It does not measure time, so it is stable across machines and
   fails whenever culling is removed or degraded.
2. **Absolute budgets (secondary).** Run in `npm run perf` and fail only on
   catastrophic regressions. The ceilings are deliberately loose so normal
   jsdom and host variance does not produce false positives.

## Structural guard

`src/test/unit/presentation/canvas/components/canvas-render-budget.test.tsx`
checks:

- the number of mounted `[data-selectable]` nodes matches
  `getVisibleElementIds(items, visibleWorld, CULLING_MARGIN).length` and is far
  below the total element count;
- mounted nodes are independent of the board size when the visible cluster is
  fixed;
- pan, zoom and selection keep the mounted set inside the visible window;
- panning to an empty area mounts zero elements.

`CULLING_MARGIN` is exported from the canvas component so the test asserts the
real contract instead of duplicating the constant.

## Performance budgets

- `src/test/perf/budgets.ts` defines `CANVAS_PERFORMANCE_BUDGETS` and the pure
  `evaluateBudgets` function.
- `src/test/perf/canvas.regression.perf.test.tsx` measures the budgeted
  scenarios at 10,000 elements and fails if a median exceeds its ceiling.
- `src/test/perf/budgets.perf.test.ts` tests the evaluator itself.
- `docs/performance/canvas-baseline.json` stores the latest reproducible
  measurement artifact.

| Metric                          |  Ceiling | Optimized reference |
| ------------------------------- | -------: | ------------------: |
| `render:mount@10000`            | 1,200 ms |             ~126 ms |
| `render:pan@10000`              |   120 ms |             ~1.6 ms |
| `render:zoom@10000`             |   120 ms |             ~1.6 ms |
| `render:selection@10000`        |   120 ms |             ~7.7 ms |
| `render:heap@10000`             |   120 MB |            ~11.9 MB |
| `toSelectableItems@10000`       |    60 ms |             ~2.7 ms |
| `findSelectableAt@10000`        |    20 ms |            ~0.02 ms |
| `findSelectablesInBounds@10000` |    60 ms |            ~0.05 ms |
| `describeBoard@10000`           |    40 ms |             ~0.3 ms |
| `elementContentBounds@10000`    |    60 ms |             ~4.5 ms |

Ceilings are meaningful **on the same host**. Recalibrate them if the measurement
environment changes substantially.

## Running the checks

```bash
# Structural guard plus the rest of the functional suite
npm test

# Absolute budgets and measurement report
npm run perf

# Regenerate the JSON artifact
PERF_WRITE=1 npm run perf

# Manual browser harness for layout, paint and FPS
npm run perf:dev
```

## Limitations

- jsdom does not paint. The suites measure React reconciliation, DOM work and
  Node heap, not real layout, paint or FPS. The manual browser harness covers
  those.
- Performance tests run serially (`--runInBand`) to avoid contaminating
  measurements.
- Budgets are sanity ceilings, not a guarantee of frame rate on every device.

## Related decisions

- ADR-0026 — canvas performance baseline.
- ADR-0027 — performance regression testing.
