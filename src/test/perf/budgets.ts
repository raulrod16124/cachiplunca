/**
 * Absolute performance budgets for the canvas regression guard (TASK-115).
 *
 * These are deliberately loose ceilings: they only fail on catastrophic
 * regressions (order-of-magnitude above the TASK-114 optimization), so they are
 * robust to the host and to jsdom noise. The primary, machine-independent guard
 * is the structural render-budget suite, which runs in `npm test`.
 *
 * Baseline reference (`docs/performance/`): at 10.000 elements TASK-113 measured
 * pan/zoom/selection around 400–470 ms and heap ~262 MB; TASK-114 brought them to
 * pan ~1,6 ms, zoom ~1,6 ms, selection ~7,7 ms and heap ~11,9 MB.
 */
import type { MetricSummary } from './measure';

/** A single ceiling: a metric label plus the maximum accepted median. */
export interface PerformanceBudget {
  readonly label: string;
  /** Maximum accepted median in the metric's own unit (`ms` or `bytes`). */
  readonly max: number;
}

export type BudgetViolation =
  | { readonly kind: 'missing'; readonly label: string }
  | {
      readonly kind: 'exceeded';
      readonly label: string;
      readonly observed: number;
      readonly max: number;
    };

/**
 * Interaction and algorithm ceilings at the worst-case board size (10.000).
 *
 * Interaction ceilings sit far below the TASK-113 baseline and far above the
 * TASK-114 optimization, so a regression to the old re-render-everything
 * behaviour fails while normal variance passes.
 */
export const CANVAS_PERFORMANCE_BUDGETS: readonly PerformanceBudget[] = [
  // Interaction re-render (ms). Optimized medians in parentheses.
  { label: 'render:mount@10000', max: 1200 }, // (~126 ms; sanity ceiling)
  { label: 'render:pan@10000', max: 120 }, // (~1,6 ms; baseline ~398 ms)
  { label: 'render:zoom@10000', max: 120 }, // (~1,6 ms; baseline ~470 ms)
  { label: 'render:selection@10000', max: 120 }, // (~7,7 ms; baseline ~407 ms)
  { label: 'render:heap@10000', max: 120_000_000 }, // (~11,9 MB; baseline ~262 MB)
  // Pure hot-path algorithms (ms). Linear and cheap; a quadratic regression blows past.
  { label: 'toSelectableItems@10000', max: 60 }, // (~2,7 ms)
  { label: 'findSelectableAt@10000', max: 20 }, // (~0,02 ms)
  { label: 'findSelectablesInBounds@10000', max: 60 }, // (~0,05 ms)
  { label: 'describeBoard@10000', max: 40 }, // (~0,3 ms)
  { label: 'elementContentBounds@10000', max: 60 }, // (~4,5 ms)
];

export function isWithinBudget(observed: number, max: number): boolean {
  return Number.isFinite(observed) && observed <= max;
}

/**
 * Compares measured metrics against the budgets. Returns one violation per
 * missing measurement or exceeded ceiling; an empty array means all pass.
 */
export function evaluateBudgets(
  metrics: readonly MetricSummary[],
  budgets: readonly PerformanceBudget[],
): readonly BudgetViolation[] {
  const byLabel = new Map(metrics.map((metric) => [metric.label, metric] as const));
  const violations: BudgetViolation[] = [];

  for (const budget of budgets) {
    const metric = byLabel.get(budget.label);

    if (metric === undefined) {
      violations.push({ kind: 'missing', label: budget.label });
      continue;
    }

    if (!isWithinBudget(metric.median, budget.max)) {
      violations.push({
        kind: 'exceeded',
        label: budget.label,
        observed: metric.median,
        max: budget.max,
      });
    }
  }

  return violations;
}

export function formatBudgetViolation(violation: BudgetViolation): string {
  return violation.kind === 'missing'
    ? `${violation.label}: no measurement recorded`
    : `${violation.label}: median ${violation.observed} exceeds budget ${violation.max}`;
}
