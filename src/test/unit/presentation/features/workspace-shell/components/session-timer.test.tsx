import { act, fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../../setup/render-with-theme';
import { SessionTimer } from '../../../../../../presentation/features/workspace-shell/components/session-timer';

const START = new Date('2026-01-01T12:00:00.000Z');

function openTimer(): void {
  fireEvent.click(screen.getByTestId('session-timer-trigger'));
}

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(START);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SessionTimer', () => {
  it('opens from the top bar and shows the default preset', () => {
    render(<SessionTimer />);

    const trigger = screen.getByRole('button', { name: 'Session timer' });
    expect(trigger).toBeInTheDocument();

    openTimer();

    expect(screen.getByRole('heading', { level: 2, name: 'Session timer' })).toBeInTheDocument();
    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('5:00');
    expect(screen.getByText('Ready to start.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('counts down, pauses and resumes with the selected preset', () => {
    render(<SessionTimer />);
    openTimer();

    fireEvent.click(screen.getByRole('button', { name: '1 min' }));
    expect(screen.getByRole('button', { name: '1 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('1:00');

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    advance(1000);

    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('0:59');
    expect(screen.getByText('Timer running.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    advance(5000);

    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('0:59');
    expect(screen.getByText('Timer paused.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    advance(1000);

    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('0:58');
  });

  it('opens a central dialog when the timer finishes', () => {
    render(<SessionTimer />);
    openTimer();

    fireEvent.click(screen.getByRole('button', { name: '1 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    openTimer();

    expect(screen.queryByTestId('session-timer-display')).not.toBeInTheDocument();
    expect(screen.getByTestId('session-timer-trigger')).toHaveAccessibleName(
      'Session timer: 1:00 remaining',
    );

    advance(60_000);

    expect(screen.getByRole('dialog', { name: 'Time is up' })).toBeInTheDocument();
    expect(screen.getByText('Your 1:00 session timer has finished.')).toBeInTheDocument();
    expect(screen.getByTestId('session-timer-trigger')).toHaveAccessibleName(
      'Session timer: 0:00 remaining',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'Time is up' })).not.toBeInTheDocument();
  });

  it('restarts the timer from the completion dialog', () => {
    render(<SessionTimer />);
    openTimer();

    fireEvent.click(screen.getByRole('button', { name: '1 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    advance(60_000);

    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));

    expect(screen.queryByRole('dialog', { name: 'Time is up' })).not.toBeInTheDocument();
    expect(screen.getByTestId('session-timer-trigger')).toHaveAccessibleName(
      'Session timer: 1:00 remaining',
    );

    advance(1000);

    expect(screen.getByTestId('session-timer-trigger')).toHaveAccessibleName(
      'Session timer: 0:59 remaining',
    );
  });

  it('resets a running timer to the selected duration', () => {
    render(<SessionTimer />);
    openTimer();

    fireEvent.click(screen.getByRole('button', { name: '3 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    advance(10_000);

    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('2:50');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByTestId('session-timer-display')).toHaveTextContent('3:00');
    expect(screen.getByText('Ready to start.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
