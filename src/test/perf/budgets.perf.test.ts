import { evaluateBudgets, formatBudgetViolation, isWithinBudget } from './budgets';
import type { PerformanceBudget } from './budgets';
import type { MetricSummary } from './measure';

function metric(label: string, median: number): MetricSummary {
  return {
    label,
    unit: 'ms',
    samples: 1,
    min: median,
    median,
    mean: median,
    p95: median,
    max: median,
  };
}

describe('isWithinBudget', () => {
  it('accepts values at or below the ceiling', () => {
    expect(isWithinBudget(0, 100)).toBe(true);
    expect(isWithinBudget(100, 100)).toBe(true);
  });

  it('rejects values above the ceiling', () => {
    expect(isWithinBudget(100.001, 100)).toBe(false);
  });

  it('rejects non-finite measurements', () => {
    expect(isWithinBudget(Number.NaN, 100)).toBe(false);
    expect(isWithinBudget(Number.POSITIVE_INFINITY, 100)).toBe(false);
  });
});

describe('evaluateBudgets', () => {
  const budgets: readonly PerformanceBudget[] = [
    { label: 'fast', max: 10 },
    { label: 'slow', max: 10 },
  ];

  it('returns no violations when every metric is within budget', () => {
    const violations = evaluateBudgets([metric('fast', 1), metric('slow', 10)], budgets);

    expect(violations).toEqual([]);
  });

  it('reports exceeded budgets with the observed median', () => {
    const violations = evaluateBudgets([metric('fast', 1), metric('slow', 42)], budgets);

    expect(violations).toEqual([{ kind: 'exceeded', label: 'slow', observed: 42, max: 10 }]);
  });

  it('reports budgets that were never measured', () => {
    const violations = evaluateBudgets([metric('fast', 1)], budgets);

    expect(violations).toEqual([{ kind: 'missing', label: 'slow' }]);
  });

  it('ignores metrics that have no budget', () => {
    const violations = evaluateBudgets([metric('fast', 1), metric('untracked', 999)], budgets);

    expect(
      violations.some((violation) => 'label' in violation && violation.label === 'untracked'),
    ).toBe(false);
  });
});

describe('formatBudgetViolation', () => {
  it('formats exceeded violations', () => {
    expect(formatBudgetViolation({ kind: 'exceeded', label: 'slow', observed: 42, max: 10 })).toBe(
      'slow: median 42 exceeds budget 10',
    );
  });

  it('formats missing violations', () => {
    expect(formatBudgetViolation({ kind: 'missing', label: 'absent' })).toBe(
      'absent: no measurement recorded',
    );
  });
});
