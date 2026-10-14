/**
 * Pure, dependency-free measurement helpers shared by the Jest baseline and the
 * manual browser harness. No Node or DOM APIs at module scope, so it can be
 * imported from either environment.
 */

export type MetricUnit = 'ms' | 'bytes' | 'fps';

export interface MetricSummary {
  readonly label: string;
  readonly unit: MetricUnit;
  readonly samples: number;
  readonly min: number;
  readonly median: number;
  readonly mean: number;
  readonly p95: number;
  readonly max: number;
}

export interface MeasureOptions {
  /** Untimed runs executed before sampling (JIT warmup). Defaults to 1. */
  readonly warmup?: number;
  /** Number of timed samples. Defaults to 1. */
  readonly iterations?: number;
}

export interface PerfEnvironment {
  readonly node: string;
  readonly platform: string;
  readonly arch: string;
  readonly cpus: number;
  readonly cpuModel: string;
  readonly totalMemoryMb: number;
  readonly timestamp: string;
}

export interface PerfReport {
  readonly environment: PerfEnvironment;
  readonly metrics: readonly MetricSummary[];
  readonly notes: readonly string[];
}

function sortedAscending(values: readonly number[]): readonly number[] {
  return [...values].sort((a, b) => a - b);
}

export function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  let total = 0;
  for (const value of values) {
    total += value;
  }

  return total / values.length;
}

/** Linear-interpolation percentile (`p` in `[0, 100]`). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  if (p <= 0) {
    return Math.min(...values);
  }

  if (p >= 100) {
    return Math.max(...values);
  }

  const sorted = sortedAscending(values);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;

  return lowerValue + (upperValue - lowerValue) * (rank - lower);
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

export function summarize(
  label: string,
  unit: MetricUnit,
  samples: readonly number[],
): MetricSummary {
  return {
    label,
    unit,
    samples: samples.length,
    min: round(percentile(samples, 0)),
    median: round(median(samples)),
    mean: round(mean(samples)),
    p95: round(percentile(samples, 95)),
    max: round(percentile(samples, 100)),
  };
}

/** Runs `warmup` untimed executions followed by `iterations` timed samples. */
export function measureSamples(run: () => void, options: MeasureOptions = {}): readonly number[] {
  const warmup = options.warmup ?? 1;
  const iterations = options.iterations ?? 1;

  for (let index = 0; index < warmup; index += 1) {
    run();
  }

  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }

  return samples;
}

export function measure(
  label: string,
  unit: MetricUnit,
  run: () => void,
  options?: MeasureOptions,
): MetricSummary {
  return summarize(label, unit, measureSamples(run, options));
}

interface GcLike {
  readonly gc?: () => void;
}

/** Requests GC when Node runs with `--expose-gc`; otherwise a no-op. */
export function requestGarbageCollection(): void {
  (globalThis as GcLike).gc?.();
}

interface ProcessLike {
  readonly memoryUsage?: () => { readonly heapUsed: number };
}

interface GlobalWithProcess {
  readonly process?: ProcessLike;
}

/** Current JS heap in bytes when available (Node), otherwise `0`. */
export function heapUsedBytes(): number {
  const memoryUsage = (globalThis as GlobalWithProcess).process?.memoryUsage;

  return typeof memoryUsage === 'function' ? memoryUsage().heapUsed : 0;
}

function formatValue(summary: MetricSummary): string {
  return `${summary.median}${summary.unit} (p95 ${summary.p95}${summary.unit})`;
}

export function formatMetric(summary: MetricSummary): string {
  return `${summary.label} · median ${formatValue(summary)} · n=${summary.samples}`;
}

export function formatMetricsTable(report: PerfReport): string {
  const rows = report.metrics.map((metric) => {
    const columns = [
      metric.label,
      String(metric.samples),
      String(metric.min),
      String(metric.median),
      String(metric.mean),
      String(metric.p95),
      String(metric.max),
      metric.unit,
    ];

    return columns.join('\t');
  });

  return ['label\tsamples\tmin\tmedian\tmean\tp95\tmax\tunit', ...rows].join('\n');
}
