import {
  formatMetric,
  formatMetricsTable,
  heapUsedBytes,
  mean,
  measure,
  measureSamples,
  median,
  percentile,
  requestGarbageCollection,
  round,
  summarize,
} from '../../perf/measure';
import type { PerfReport } from '../../perf/measure';

describe('perf/measure', () => {
  describe('round', () => {
    it('rounds to the requested number of decimals', () => {
      expect(round(1.23456, 2)).toBe(1.23);
      expect(round(1.23456)).toBe(1.235);
    });
  });

  describe('mean', () => {
    it('returns 0 for an empty sample', () => {
      expect(mean([])).toBe(0);
    });

    it('averages the sample', () => {
      expect(mean([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('percentile', () => {
    it('returns 0 for an empty sample', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('returns the min at p0 and the max at p100', () => {
      expect(percentile([5, 1, 9], 0)).toBe(1);
      expect(percentile([5, 1, 9], 100)).toBe(9);
    });

    it('interpolates between neighbours', () => {
      expect(percentile([0, 10], 50)).toBe(5);
      expect(percentile([0, 10, 20, 30], 75)).toBe(22.5);
    });
  });

  describe('median', () => {
    it('returns the middle value', () => {
      expect(median([3, 1, 2])).toBe(2);
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('summarize', () => {
    it('describes the sample with min/median/mean/p95/max', () => {
      const summary = summarize('render', 'ms', [10, 20, 30, 40, 50]);

      expect(summary).toEqual({
        label: 'render',
        unit: 'ms',
        samples: 5,
        min: 10,
        median: 30,
        mean: 30,
        p95: 48,
        max: 50,
      });
    });
  });

  describe('measureSamples', () => {
    it('runs warmup plus iterations and returns one sample per iteration', () => {
      let calls = 0;
      const samples = measureSamples(
        () => {
          calls += 1;
        },
        { warmup: 2, iterations: 3 },
      );

      expect(calls).toBe(5);
      expect(samples).toHaveLength(3);
      for (const sample of samples) {
        expect(sample).toBeGreaterThanOrEqual(0);
      }
    });

    it('defaults to a single warmup and a single iteration', () => {
      let calls = 0;
      const samples = measureSamples(() => {
        calls += 1;
      });

      expect(calls).toBe(2);
      expect(samples).toHaveLength(1);
    });
  });

  describe('measure', () => {
    it('returns a labelled summary', () => {
      const summary = measure('pan', 'ms', () => undefined, { warmup: 0, iterations: 2 });

      expect(summary.label).toBe('pan');
      expect(summary.unit).toBe('ms');
      expect(summary.samples).toBe(2);
    });
  });

  describe('heap and GC helpers', () => {
    it('reports a non-negative heap size', () => {
      expect(heapUsedBytes()).toBeGreaterThanOrEqual(0);
    });

    it('requests GC without throwing when it is unavailable', () => {
      expect(() => requestGarbageCollection()).not.toThrow();
    });
  });

  describe('formatting', () => {
    const report: PerfReport = {
      environment: {
        node: 'v22.0.0',
        platform: 'darwin',
        arch: 'arm64',
        cpus: 8,
        cpuModel: 'test',
        totalMemoryMb: 16384,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      metrics: [
        { label: 'render', unit: 'ms', samples: 3, min: 1, median: 2, mean: 2, p95: 3, max: 3 },
      ],
      notes: [],
    };

    it('formats a single metric', () => {
      const metric = report.metrics[0];
      expect(metric).toBeDefined();
      if (metric === undefined) {
        return;
      }

      expect(formatMetric(metric)).toContain('render');
      expect(formatMetric(metric)).toContain('n=3');
    });

    it('renders a tab-separated table with a header', () => {
      const table = formatMetricsTable(report);
      const lines = table.split('\n');

      expect(lines[0]).toContain('label');
      expect(lines[1]).toContain('render');
      expect(lines[1]).toContain('ms');
    });
  });
});
