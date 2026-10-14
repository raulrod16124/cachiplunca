import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { arch, cpus, platform, totalmem } from 'node:os';
import { cwd, env } from 'node:process';
import type { MetricSummary, PerfEnvironment, PerfReport } from './measure';

const DEFAULT_REPORT_PATH = 'docs/performance/canvas-baseline.json';

interface ProcessLike {
  readonly version?: string;
}

export function captureEnvironment(): PerfEnvironment {
  const nodeProcess = (globalThis as { process?: ProcessLike }).process;
  const cpuList = cpus();

  return {
    node: nodeProcess?.version ?? 'unknown',
    platform: platform(),
    arch: arch(),
    cpus: cpuList.length,
    cpuModel: cpuList[0]?.model ?? 'unknown',
    totalMemoryMb: Math.round(totalmem() / (1024 * 1024)),
    timestamp: new Date().toISOString(),
  };
}

export function buildReport(
  metrics: readonly MetricSummary[],
  notes: readonly string[] = [],
): PerfReport {
  return { environment: captureEnvironment(), metrics, notes };
}

export function isPerfWriteEnabled(): boolean {
  return env.PERF_WRITE === '1' || env.PERF_WRITE === 'true';
}

/** Writes the report JSON to disk and returns the absolute path. */
export function writePerfReport(
  report: PerfReport,
  relativePath: string = DEFAULT_REPORT_PATH,
): string {
  const target = resolve(cwd(), relativePath);

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return target;
}
