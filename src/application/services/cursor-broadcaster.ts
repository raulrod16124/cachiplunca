import type { Position } from '../../domain/shared';
import type { Presence } from '../../domain/collaboration';
import { toAppError, type AppError } from '../../shared/errors';
import type { PresencePort } from '../ports';
import {
  createTimeoutScheduler,
  type CancelScheduledFlush,
  type Scheduler,
} from './element-persistence-batcher';

export const DEFAULT_CURSOR_THROTTLE_MS = 80;

export interface CursorBroadcaster {
  move(cursor: Position): void;
  flush(): Promise<void>;
  stop(): void;
}

export interface CursorBroadcasterOptions {
  readonly presencePort: PresencePort;
  readonly basePresence: Presence;
  readonly onError?: (error: AppError) => void;
  readonly throttleMs?: number;
  readonly scheduler?: Scheduler;
}

function normalizeThrottleMs(throttleMs: number | undefined): number {
  if (throttleMs === undefined || !Number.isFinite(throttleMs) || throttleMs < 0) {
    return DEFAULT_CURSOR_THROTTLE_MS;
  }

  return Math.floor(throttleMs);
}

export function createCursorBroadcaster(options: CursorBroadcasterOptions): CursorBroadcaster {
  const { presencePort, basePresence, onError } = options;
  const throttleMs = normalizeThrottleMs(options.throttleMs);
  const scheduler: Scheduler = options.scheduler ?? createTimeoutScheduler();

  let latest: Position | null = null;
  let lastSent: Position | null = null;
  let cancelScheduled: CancelScheduledFlush | null = null;
  let stopped = false;

  function send(cursor: Position): Promise<void> {
    lastSent = cursor;
    return presencePort.announce(basePresence.moveCursor(cursor)).catch((error: unknown) => {
      onError?.(toAppError(error));
    });
  }

  function flush(): Promise<void> {
    if (cancelScheduled !== null) {
      cancelScheduled();
      cancelScheduled = null;
    }

    if (latest === null || (lastSent !== null && lastSent.equals(latest))) {
      return Promise.resolve();
    }

    return send(latest);
  }

  function scheduleTrailing(): void {
    if (cancelScheduled !== null) {
      return;
    }

    cancelScheduled = scheduler.schedule(() => {
      cancelScheduled = null;
      void flush();
    }, throttleMs);
  }

  return {
    move(cursor) {
      if (stopped) {
        return;
      }

      if (latest !== null && latest.equals(cursor)) {
        return;
      }

      latest = cursor;

      if (lastSent === null) {
        void send(cursor);
        scheduleTrailing();
        return;
      }

      scheduleTrailing();
    },

    flush() {
      return flush();
    },

    stop() {
      stopped = true;
      if (cancelScheduled !== null) {
        cancelScheduled();
        cancelScheduled = null;
      }
      latest = null;
      lastSent = null;
    },
  };
}
