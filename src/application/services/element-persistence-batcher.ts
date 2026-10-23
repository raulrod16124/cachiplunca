import type { Element } from '../../domain/element';
import type { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { PersistElementMutationResult } from './element-persistence';
import type { ElementPersistenceOrchestrator } from './element-persistence-orchestrator';

export const DEFAULT_PERSIST_DEBOUNCE_MS = 300;

export type CancelScheduledFlush = () => void;

export type PersistenceSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  readonly workspaceId?: WorkspaceId;
  readonly onResult?: (result: PersistElementMutationResult) => void;
  readonly onStatusChange?: (status: PersistenceSyncStatus) => void;
  readonly onMutationFailed?: (mutation: FailedElementMutation, error: AppError) => void;
  readonly onPersistedMutation?: (mutation: PersistedElementMutation) => void;
  readonly delayMs?: number;
  readonly scheduler?: Scheduler;
}

export interface FailedElementMutation {
  readonly previous: readonly Element[];
  readonly next: readonly Element[];
}

export interface PersistedElementMutation {
  readonly previous: readonly Element[];
  readonly next: readonly Element[];
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
  const { orchestrator, onResult, onStatusChange, onMutationFailed, onPersistedMutation } = options;
  const delayMs = normalizeDelayMs(options.delayMs);
  const scheduler = options.scheduler ?? createTimeoutScheduler();

  let pending: PendingMutation | null = null;
  let cancelScheduled: CancelScheduledFlush | null = null;
  let chain: Promise<void> = Promise.resolve();
  let disposed = false;
  let inFlight = 0;
  let syncStatus: PersistenceSyncStatus = 'idle';

  function emitStatus(next: PersistenceSyncStatus): void {
    if (syncStatus === next) {
      return;
    }
    syncStatus = next;
    onStatusChange?.(next);
  }

  function persist(target: PendingMutation): Promise<void> {
    inFlight += 1;
    chain = chain.then(async () => {
      const result = await resolvePersistResult(orchestrator, target, options.workspaceId);
      inFlight -= 1;
      onResult?.(result);

      if (result.status === 'error') {
        dropPending();
        onMutationFailed?.({ previous: target.previous, next: target.next }, result.error);
        emitStatus('error');
      } else {
        onPersistedMutation?.({ previous: target.previous, next: target.next });

        if (inFlight === 0 && pending === null) {
          emitStatus('saved');
        }
      }
    });
    return chain;
  }

  function dropPending(): void {
    pending = null;
    if (cancelScheduled !== null) {
      cancelScheduled();
      cancelScheduled = null;
    }
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
      emitStatus('saving');

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

async function resolvePersistResult(
  orchestrator: ElementPersistenceOrchestrator,
  target: PendingMutation,
  workspaceId?: WorkspaceId,
): Promise<PersistElementMutationResult> {
  try {
    return await orchestrator.persistDelta(target.previous, target.next, workspaceId);
  } catch (error) {
    return { status: 'error', error: toAppError(error) };
  }
}
