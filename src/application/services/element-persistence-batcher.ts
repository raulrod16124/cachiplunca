import type { Element } from '../../domain/element';
import type { PersistElementMutationResult } from './element-persistence';
import type { ElementPersistenceOrchestrator } from './element-persistence-orchestrator';

export const DEFAULT_PERSIST_DEBOUNCE_MS = 300;

export type CancelScheduledFlush = () => void;

export interface Scheduler {
  schedule(callback: () => void, delayMs: number): CancelScheduledFlush;
}

export interface ElementPersistenceBatcher {
  schedule(previous: readonly Element[], next: readonly Element[]): void;
  flush(): Promise<void>;
  dispose(): void;
}

export interface ElementPersistenceBatcherOptions {
  readonly orchestrator: ElementPersistenceOrchestrator;
  readonly onResult?: (result: PersistElementMutationResult) => void;
  readonly delayMs?: number;
  readonly scheduler?: Scheduler;
}

export function createTimeoutScheduler(): Scheduler {
  return {
    schedule(callback, delayMs) {
      const handle = setTimeout(callback, delayMs);
      return () => clearTimeout(handle);
    },
  };
}

interface PendingMutation {
  readonly previous: readonly Element[];
  readonly next: readonly Element[];
}

export function createElementPersistenceBatcher(
  options: ElementPersistenceBatcherOptions,
): ElementPersistenceBatcher {
  const { orchestrator, onResult } = options;
  const delayMs = normalizeDelayMs(options.delayMs);
  const scheduler = options.scheduler ?? createTimeoutScheduler();

  let pending: PendingMutation | null = null;
  let cancelScheduled: CancelScheduledFlush | null = null;
  let chain: Promise<void> = Promise.resolve();
  let disposed = false;

  function persist(target: PendingMutation): Promise<void> {
    chain = chain.then(async () => {
      const result = await orchestrator.persistDelta(target.previous, target.next);
      onResult?.(result);
    });
    return chain;
  }

  function runPending(): Promise<void> {
    const target = pending;
    pending = null;

    if (target === null) {
      return chain;
    }

    return persist(target);
  }

  return {
    schedule(previous, next) {
      if (disposed) {
        return;
      }

      pending = pending === null ? { previous, next } : { previous: pending.previous, next };

      if (cancelScheduled !== null) {
        cancelScheduled();
      }

      cancelScheduled = scheduler.schedule(() => {
        cancelScheduled = null;
        void runPending();
      }, delayMs);
    },

    flush() {
      if (cancelScheduled !== null) {
        cancelScheduled();
        cancelScheduled = null;
      }

      return runPending();
    },

    dispose() {
      disposed = true;
      pending = null;

      if (cancelScheduled !== null) {
        cancelScheduled();
        cancelScheduled = null;
      }
    },
  };
}

function normalizeDelayMs(delayMs: number | undefined): number {
  if (delayMs === undefined || !Number.isFinite(delayMs) || delayMs < 0) {
    return DEFAULT_PERSIST_DEBOUNCE_MS;
  }

  return Math.floor(delayMs);
}
