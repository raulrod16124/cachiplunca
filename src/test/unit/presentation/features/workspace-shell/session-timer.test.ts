import {
  createSessionTimerState,
  DEFAULT_SESSION_TIMER_DURATION_MS,
  formatSessionTimerRemaining,
  sessionTimerReducer,
  SESSION_TIMER_PRESETS_MS,
} from '../../../../../presentation/features/workspace-shell/session-timer';

describe('sessionTimerReducer', () => {
  it('starts from the default duration in idle state', () => {
    const state = createSessionTimerState();

    expect(state).toEqual({
      durationMs: DEFAULT_SESSION_TIMER_DURATION_MS,
      remainingMs: DEFAULT_SESSION_TIMER_DURATION_MS,
      status: 'idle',
      endsAt: null,
    });
    expect(SESSION_TIMER_PRESETS_MS).toEqual([60_000, 180_000, 300_000, 600_000]);
  });

  it('selects a preset and resets the countdown', () => {
    const state = sessionTimerReducer(createSessionTimerState(), {
      type: 'select',
      durationMs: 60_000,
    });

    expect(state.durationMs).toBe(60_000);
    expect(state.remainingMs).toBe(60_000);
    expect(state.status).toBe('idle');
  });

  it('starts, ticks down and finishes at zero', () => {
    const started = sessionTimerReducer(createSessionTimerState(60_000), {
      type: 'start',
      now: 1_000,
    });

    expect(started.status).toBe('running');
    expect(started.endsAt).toBe(61_000);

    const ticked = sessionTimerReducer(started, { type: 'tick', now: 2_000 });

    expect(ticked.remainingMs).toBe(59_000);
    expect(ticked.status).toBe('running');

    const finished = sessionTimerReducer(ticked, { type: 'tick', now: 61_000 });

    expect(finished.remainingMs).toBe(0);
    expect(finished.status).toBe('finished');
    expect(finished.endsAt).toBeNull();
  });

  it('pauses at the current remaining time and ignores ticks while paused', () => {
    const started = sessionTimerReducer(createSessionTimerState(60_000), {
      type: 'start',
      now: 1_000,
    });
    const paused = sessionTimerReducer(started, { type: 'pause', now: 11_000 });

    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBe(50_000);
    expect(paused.endsAt).toBeNull();
    expect(sessionTimerReducer(paused, { type: 'tick', now: 20_000 })).toBe(paused);
  });

  it('resumes from a paused state using the stored remaining time', () => {
    const paused = {
      ...createSessionTimerState(60_000),
      remainingMs: 50_000,
      status: 'paused' as const,
    };
    const resumed = sessionTimerReducer(paused, { type: 'start', now: 20_000 });

    expect(resumed.status).toBe('running');
    expect(resumed.endsAt).toBe(70_000);
    expect(resumed.remainingMs).toBe(50_000);
  });

  it('restarts from the full duration after finishing', () => {
    const finished = {
      ...createSessionTimerState(60_000),
      remainingMs: 0,
      status: 'finished' as const,
    };
    const restarted = sessionTimerReducer(finished, { type: 'start', now: 5_000 });

    expect(restarted.status).toBe('running');
    expect(restarted.remainingMs).toBe(60_000);
    expect(restarted.endsAt).toBe(65_000);
  });

  it('resets to the selected duration without losing the preset', () => {
    const running = sessionTimerReducer(createSessionTimerState(180_000), {
      type: 'start',
      now: 1_000,
    });
    const reset = sessionTimerReducer(running, { type: 'reset' });

    expect(reset).toEqual({
      durationMs: 180_000,
      remainingMs: 180_000,
      status: 'idle',
      endsAt: null,
    });
  });

  it('keeps the same state when selecting the current preset while idle', () => {
    const state = createSessionTimerState(300_000);

    expect(sessionTimerReducer(state, { type: 'select', durationMs: 300_000 })).toBe(state);
  });

  it('finishes if paused exactly at the deadline', () => {
    const started = sessionTimerReducer(createSessionTimerState(60_000), {
      type: 'start',
      now: 0,
    });
    const paused = sessionTimerReducer(started, { type: 'pause', now: 60_000 });

    expect(paused.status).toBe('finished');
    expect(paused.remainingMs).toBe(0);
  });
});

describe('formatSessionTimerRemaining', () => {
  it('formats whole minutes and pads the seconds', () => {
    expect(formatSessionTimerRemaining(600_000)).toBe('10:00');
    expect(formatSessionTimerRemaining(60_000)).toBe('1:00');
    expect(formatSessionTimerRemaining(61_000)).toBe('1:01');
    expect(formatSessionTimerRemaining(59_000)).toBe('0:59');
    expect(formatSessionTimerRemaining(0)).toBe('0:00');
  });

  it('rounds partial seconds up and clamps negative values', () => {
    expect(formatSessionTimerRemaining(58_100)).toBe('0:59');
    expect(formatSessionTimerRemaining(-1_000)).toBe('0:00');
  });
});
