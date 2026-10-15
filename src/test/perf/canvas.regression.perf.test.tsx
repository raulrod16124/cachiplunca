import { act, render } from '@testing-library/react';
import { Bounds, Position, Size } from '../../domain/shared';
import {
  createCanvasViewportStore,
  createSelectionStore,
  elementContentBounds,
  findSelectableAt,
  findSelectablesInBounds,
  toSelectableItems,
} from '../../application/services';
import { Canvas } from '../../presentation/canvas/components/canvas';
import { describeBoard } from '../../presentation/canvas/accessibility';
import { generateElements } from '../fixtures/generate-elements';
import {
  heapUsedBytes,
  measure,
  measureSamples,
  requestGarbageCollection,
  summarize,
} from './measure';
import type { MeasureOptions, MetricSummary } from './measure';
import { CANVAS_PERFORMANCE_BUDGETS, evaluateBudgets, formatBudgetViolation } from './budgets';

/**
 * Canvas performance-regression guard (TASK-115), run with `npm run perf`.
 *
 * Unlike `canvas.perf.test.tsx` (measurement only), this suite asserts absolute
 * ceilings from `budgets.ts` so a catastrophic regression fails the perf task.
 * The ceilings are intentionally loose and same-host; the machine-independent
 * guard is the structural render-budget suite in `npm test`.
 */
const COUNT = 10000;

const ALGORITHM_OPTIONS: MeasureOptions = { warmup: 1, iterations: 5 };
const RENDER_OPTIONS: MeasureOptions = { warmup: 1, iterations: 5 };
const MOUNT_OPTIONS: MeasureOptions = { warmup: 0, iterations: 2 };

const metrics: MetricSummary[] = [];

function record(summary: MetricSummary): void {
  metrics.push(summary);
}

afterAll(() => {
  const violations = evaluateBudgets(metrics, CANVAS_PERFORMANCE_BUDGETS);

  if (violations.length > 0) {
    console.log('\nPerformance budget violations:');
    for (const violation of violations) {
      console.log(`- ${formatBudgetViolation(violation)}`);
    }
  } else {
    console.log(`\nAll ${CANVAS_PERFORMANCE_BUDGETS.length} performance budgets passed.`);
  }
});

describe('canvas performance budgets (10000 elements)', () => {
  const elements = generateElements({ count: COUNT });
  const items = toSelectableItems(elements);
  const worldBounds = Bounds.fromXYWH(-1_000_000, -1_000_000, 2_000_000, 2_000_000);
  const farAway = Position.create(-1_000_000, -1_000_000);

  it('measures every budgeted scenario within its absolute budget', () => {
    record(
      measure(
        'toSelectableItems@10000',
        'ms',
        () => {
          toSelectableItems(elements);
        },
        ALGORITHM_OPTIONS,
      ),
    );
    record(
      measure(
        'findSelectableAt@10000',
        'ms',
        () => {
          findSelectableAt(items, farAway);
        },
        ALGORITHM_OPTIONS,
      ),
    );
    record(
      measure(
        'findSelectablesInBounds@10000',
        'ms',
        () => {
          findSelectablesInBounds(items, worldBounds);
        },
        ALGORITHM_OPTIONS,
      ),
    );
    record(
      measure(
        'describeBoard@10000',
        'ms',
        () => {
          describeBoard(elements);
        },
        ALGORITHM_OPTIONS,
      ),
    );
    record(
      measure(
        'elementContentBounds@10000',
        'ms',
        () => {
          elementContentBounds(elements);
        },
        ALGORITHM_OPTIONS,
      ),
    );

    const store = createCanvasViewportStore(Size.create(1280, 800));
    const selectionStore = createSelectionStore();

    const mountSamples = measureSamples(() => {
      const view = render(
        <Canvas store={store} selectionStore={selectionStore} elements={elements} />,
      );
      view.unmount();
    }, MOUNT_OPTIONS);
    record(summarize('render:mount@10000', 'ms', mountSamples));

    const view = render(
      <Canvas store={store} selectionStore={selectionStore} elements={elements} />,
    );

    record(
      summarize(
        'render:pan@10000',
        'ms',
        measureSamples(() => {
          act(() => {
            store.pan(Position.create(4, 4));
          });
        }, RENDER_OPTIONS),
      ),
    );

    record(
      summarize(
        'render:zoom@10000',
        'ms',
        measureSamples(() => {
          act(() => {
            store.zoom(1.02, Position.create(400, 300));
          });
        }, RENDER_OPTIONS),
      ),
    );

    const ids = elements.map((element) => element.id.value);
    const evens = ids.filter((_, index) => index % 2 === 0);
    const odds = ids.filter((_, index) => index % 2 === 1);
    let flip = false;
    record(
      summarize(
        'render:selection@10000',
        'ms',
        measureSamples(() => {
          const target = flip ? odds : evens;
          flip = !flip;
          act(() => {
            selectionStore.selectMany(target);
          });
        }, RENDER_OPTIONS),
      ),
    );

    view.unmount();

    requestGarbageCollection();
    const heapBefore = heapUsedBytes();
    const probe = render(
      <Canvas
        store={createCanvasViewportStore(Size.create(1280, 800))}
        selectionStore={createSelectionStore()}
        elements={elements}
      />,
    );
    const heapAfter = heapUsedBytes();
    probe.unmount();
    record(summarize('render:heap@10000', 'bytes', [heapAfter - heapBefore]));

    expect(metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(CANVAS_PERFORMANCE_BUDGETS.map((budget) => budget.label)),
    );

    const violations = evaluateBudgets(metrics, CANVAS_PERFORMANCE_BUDGETS);

    expect(violations.map(formatBudgetViolation)).toEqual([]);
  });
});
