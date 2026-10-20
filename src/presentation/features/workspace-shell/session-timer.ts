export const SESSION_TIMER_PRESETS_MS = [60_000, 180_000, 300_000, 600_000] as const;

export const DEFAULT_SESSION_TIMER_DURATION_MS = 300_000;

export type SessionTimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface SessionTimerState {
  readonly durationMs: number;
  readonly remainingMs: number;
  readonly status: SessionTimerStatus;
  readonly endsAt: number | null;
}

export type SessionTimerAction =
  | { readonly type: 'select'; readonly durationMs: number }
  | { readonly type: 'start'; readonly now: number }
  | { readonly type: 'pause'; readonly now: number }
  | { readonly type: 'reset' }
  | { readonly type: 'tick'; readonly now: number };

export function createSessionTimerState(
  durationMs: number = DEFAULT_SESSION_TIMER_DURATION_MS,
): SessionTimerState {
  return {
    durationMs,
    remainingMs: durationMs,
    status: 'idle',
    endsAt: null,
  };
}

function remainingAt(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

export function sessionTimerReducer(
  state: SessionTimerState,
  action: SessionTimerAction,
): SessionTimerState {
  switch (action.type) {
    case 'select': {
      if (action.durationMs === state.durationMs && state.status === 'idle') {
        return state;
      }

      return createSessionTimerState(action.durationMs);
    }
    case 'start': {
      if (state.status === 'running') {
        return state;
      }

      const remainingMs = state.remainingMs <= 0 ? state.durationMs : state.remainingMs;

      return {
        ...state,
        remainingMs,
        status: 'running',
        endsAt: action.now + remainingMs,
      };
    }
    case 'pause': {
      if (state.status !== 'running' || state.endsAt === null) {
        return state;
      }

      const remainingMs = remainingAt(state.endsAt, action.now);

      return {
        ...state,
        remainingMs,
        status: remainingMs === 0 ? 'finished' : 'paused',
        endsAt: null,
      };
    }
    case 'reset':
      return createSessionTimerState(state.durationMs);
    case 'tick': {
      if (state.status !== 'running' || state.endsAt === null) {
        return state;
      }

      const remainingMs = remainingAt(state.endsAt, action.now);

      if (remainingMs === state.remainingMs) {
        return state;
      }

      if (remainingMs === 0) {
        return {
          ...state,
          remainingMs: 0,
          status: 'finished',
          endsAt: null,
        };
      }

      return { ...state, remainingMs };
    }
  }
}

export function formatSessionTimerRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
