import { Button, Inline, Popover, Text, VisuallyHidden } from '@raulrod/ui';
import { Pause, Play, RotateCcw, Timer as TimerIcon } from '@raulrod/icons';
import { useEffect, useReducer, type ReactNode } from 'react';
import styled from 'styled-components';
import { useI18n, type TranslationKey } from '../../../i18n';
import {
  createSessionTimerState,
  formatSessionTimerRemaining,
  sessionTimerReducer,
  SESSION_TIMER_PRESETS_MS,
  type SessionTimerStatus,
} from '../session-timer';

const ICON_SIZE = 16;

const STATUS_KEYS: Record<SessionTimerStatus, TranslationKey> = {
  idle: 'sessionTimer.status.idle',
  running: 'sessionTimer.status.running',
  paused: 'sessionTimer.status.paused',
  finished: 'sessionTimer.status.finished',
};

const Trigger = styled(Popover.Trigger)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border: 1px solid ${({ theme }) => theme.color.border.strong};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.action.secondary.background};
  color: ${({ theme }) => theme.color.action.secondary.text};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: ${({ theme }) => theme.font.leading.none};
  font-variant-numeric: tabular-nums;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.action.secondary.backgroundHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 260px;
`;

const PresetRow = styled(Inline)`
  flex-wrap: wrap;
`;

const TimeDisplay = styled(Text)`
  font-size: ${({ theme }) => theme.font.size['2xl']};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  font-variant-numeric: tabular-nums;
  line-height: ${({ theme }) => theme.font.leading.none};
`;

export function SessionTimer(): ReactNode {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(sessionTimerReducer, undefined, () =>
    createSessionTimerState(),
  );
  const formattedRemaining = formatSessionTimerRemaining(state.remainingMs);

  useEffect(() => {
    if (state.status !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: 'tick', now: Date.now() });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [state.status]);

  const triggerLabel =
    state.status === 'idle'
      ? t('sessionTimer.open')
      : t('sessionTimer.openRemaining', { time: formattedRemaining });

  return (
    <>
      <Popover>
        <Trigger
          aria-label={triggerLabel}
          data-testid="session-timer-trigger"
          data-status={state.status}
        >
          <TimerIcon aria-hidden="true" size={ICON_SIZE} />
          {state.status === 'idle' ? null : <span>{formattedRemaining}</span>}
        </Trigger>
        <Popover.Content placement="bottom-end">
          <Panel>
            <Popover.Title>{t('sessionTimer.title')}</Popover.Title>
            <Text color="color.text.muted" size="font.size.sm">
              {t('sessionTimer.description')}
            </Text>
            <Text size="font.size.sm" weight="font.weight.medium">
              {t('sessionTimer.durationLabel')}
            </Text>
            <PresetRow gap="space-1" role="group" aria-label={t('sessionTimer.durationLabel')}>
              {SESSION_TIMER_PRESETS_MS.map((durationMs) => (
                <Button
                  key={durationMs}
                  type="button"
                  size="sm"
                  variant={state.durationMs === durationMs ? 'primary' : 'secondary'}
                  aria-pressed={state.durationMs === durationMs}
                  onClick={() => dispatch({ type: 'select', durationMs })}
                >
                  {t('sessionTimer.minutes', { count: durationMs / 60_000 })}
                </Button>
              ))}
            </PresetRow>
            <TimeDisplay
              role="timer"
              aria-live="off"
              aria-atomic="true"
              aria-label={t('sessionTimer.remaining', { time: formattedRemaining })}
              data-testid="session-timer-display"
            >
              {formattedRemaining}
            </TimeDisplay>
            <Text color="color.text.muted" size="font.size.sm">
              {t(STATUS_KEYS[state.status])}
            </Text>
            <Inline gap="space-2">
              {state.status === 'running' ? (
                <Button
                  type="button"
                  size="sm"
                  startIcon={<Pause aria-hidden="true" size={ICON_SIZE} />}
                  onClick={() => dispatch({ type: 'pause', now: Date.now() })}
                >
                  {t('sessionTimer.pause')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  startIcon={<Play aria-hidden="true" size={ICON_SIZE} />}
                  onClick={() => dispatch({ type: 'start', now: Date.now() })}
                >
                  {state.status === 'paused' ? t('sessionTimer.resume') : t('sessionTimer.start')}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                startIcon={<RotateCcw aria-hidden="true" size={ICON_SIZE} />}
                disabled={state.status === 'idle'}
                onClick={() => dispatch({ type: 'reset' })}
              >
                {t('sessionTimer.reset')}
              </Button>
            </Inline>
          </Panel>
        </Popover.Content>
      </Popover>
      {state.status === 'finished' ? (
        <VisuallyHidden role="status" aria-live="polite">
          {t('sessionTimer.finished')}
        </VisuallyHidden>
      ) : null}
    </>
  );
}
