import type { ReactElement } from 'react';
import { StrictMode, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Position, Size } from '../../../domain/shared';
import { createCanvasViewportStore, createSelectionStore } from '../../../application/services';
import { Canvas } from '../../../presentation/canvas/components/canvas';
import { AppThemeProvider } from '../../../presentation/styles';
import { generateElements } from '../../fixtures/generate-elements';
import { formatMetricsTable, measureSamples, round, summarize } from '../measure';
import type { MetricSummary, PerfEnvironment, PerfReport } from '../measure';

const SIZES = [100, 1000, 5000, 10000] as const;
const FRAMES = 90;
const VIEWPORT = Size.create(1280, 800);

interface MemoryLike {
  readonly usedJSHeapSize?: number;
}

interface NavigatorMemory {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly userAgent?: string;
}

function browserEnvironment(): PerfEnvironment {
  const navigatorLike = globalThis.navigator as NavigatorMemory | undefined;

  return {
    node: 'browser',
    platform: navigatorLike?.userAgent ?? 'unknown',
    arch: 'browser',
    cpus: navigatorLike?.hardwareConcurrency ?? 0,
    cpuModel: 'browser',
    totalMemoryMb: Math.round((navigatorLike?.deviceMemory ?? 0) * 1024),
    timestamp: new Date().toISOString(),
  };
}

function usedHeapBytes(): number {
  const memory = (performance as unknown as { memory?: MemoryLike }).memory;

  return memory?.usedJSHeapSize ?? 0;
}

function measureFrames(onFrame: () => void, frames: number): Promise<readonly number[]> {
  return new Promise((resolve) => {
    const samples: number[] = [];
    let previous = performance.now();
    let remaining = frames;

    const tick = (): void => {
      const now = performance.now();
      samples.push(now - previous);
      previous = now;
      onFrame();
      remaining -= 1;

      if (remaining > 0) {
        requestAnimationFrame(tick);
      } else {
        resolve(samples.slice(1));
      }
    };

    requestAnimationFrame(tick);
  });
}

function mountSamplesFor(
  elements: readonly ReturnType<typeof generateElements>[number][],
): readonly number[] {
  return measureSamples(
    () => {
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-99999px;top:0;width:1280px;height:800px;';
      document.body.append(container);
      const root = createRoot(container);
      flushSync(() => {
        root.render(
          <AppThemeProvider>
            <Canvas
              store={createCanvasViewportStore(VIEWPORT)}
              selectionStore={createSelectionStore()}
              elements={elements}
            />
          </AppThemeProvider>,
        );
      });
      root.unmount();
      container.remove();
    },
    { warmup: 1, iterations: elements.length >= 5000 ? 2 : 3 },
  );
}

export function App(): ReactElement {
  const [size, setSize] = useState<number>(SIZES[0]);
  const [metrics, setMetrics] = useState<readonly MetricSummary[]>([]);
  const [running, setRunning] = useState(false);
  const elementsRef = useRef(generateElements({ count: SIZES[0] }));
  const storeRef = useRef(createCanvasViewportStore(VIEWPORT));
  const selectionRef = useRef(createSelectionStore());

  const remount = useCallback((nextSize: number): void => {
    elementsRef.current = generateElements({ count: nextSize });
    storeRef.current = createCanvasViewportStore(VIEWPORT);
    selectionRef.current = createSelectionStore();
    setMetrics([]);
  }, []);

  const run = useCallback(async (): Promise<void> => {
    setRunning(true);
    const collected: MetricSummary[] = [];
    const elements = elementsRef.current;
    const store = storeRef.current;
    const selection = selectionRef.current;
    const ids = elements.map((element) => element.id.value);
    const evens = ids.filter((_, index) => index % 2 === 0);
    const odds = ids.filter((_, index) => index % 2 === 1);

    collected.push(summarize(`render:mount@${size}`, 'ms', mountSamplesFor([...elements])));

    const panFrames = await measureFrames(() => store.pan(Position.create(6, 4)), FRAMES);
    collected.push(summarize(`pan@${size} (frame)`, 'ms', panFrames));
    collected.push(
      summarize(
        `pan@${size} (fps)`,
        'fps',
        panFrames.map((frame) => round(1000 / Math.max(frame, 0.001))),
      ),
    );

    const zoomFrames = await measureFrames(
      () => store.zoom(1.01, Position.create(640, 400)),
      FRAMES,
    );
    collected.push(summarize(`zoom@${size} (frame)`, 'ms', zoomFrames));

    let flip = false;
    const selectionFrames = await measureFrames(() => {
      selection.selectMany(flip ? odds : evens);
      flip = !flip;
    }, FRAMES);
    collected.push(summarize(`selection@${size} (frame)`, 'ms', selectionFrames));

    collected.push(summarize(`heap@${size} (used)`, 'bytes', [usedHeapBytes()]));

    setMetrics(collected);
    setRunning(false);
  }, [size]);

  const report: PerfReport = {
    environment: browserEnvironment(),
    metrics,
    notes: [
      `Browser harness · ${FRAMES} animation frames per interaction scenario (first frame discarded).`,
      'Frame metrics include style/layout/paint; mount is React render + commit via flushSync.',
    ],
  };

  const reportJson = JSON.stringify(report, null, 2);

  return (
    <div style={{ fontFamily: 'monospace', padding: 12 }}>
      <h1>Canvas performance harness</h1>
      <p>
        Manual browser baseline for TASK-113. Open with <code>npm run perf:dev</code>. Metrics are
        machine- and browser-dependent; compare runs on the same host.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <label>
          Elements:{' '}
          <select
            value={size}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSize(next);
              remount(next);
            }}
          >
            {SIZES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void run()} disabled={running}>
          {running ? 'Running…' : 'Run scenarios'}
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(reportJson);
          }}
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([reportJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `canvas-baseline-${size}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download JSON
        </button>
      </div>
      <div style={{ height: '60vh', border: '1px solid #888', position: 'relative' }}>
        <Canvas
          store={storeRef.current}
          selectionStore={selectionRef.current}
          elements={elementsRef.current}
        />
      </div>
      <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{formatMetricsTable(report)}</pre>
    </div>
  );
}

const container = document.querySelector('#root');

if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </StrictMode>,
  );
}
