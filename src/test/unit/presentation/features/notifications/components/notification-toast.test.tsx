import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../../../domain/shared';
import { Notification } from '../../../../../../domain/notification';
import { NotificationToast } from '../../../../../../presentation/features/notifications/components/notification-toast';

const NOTIFICATION = Notification.create({
  id: NotificationId.create('comment-1_user-1'),
  type: 'comment',
  recipientId: UserId.create('user-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  workspaceName: 'Roadmap',
  elementId: ElementId.create('el-1'),
  commentId: CommentId.create('comment-1'),
  actorId: UserId.create('user-2'),
  actorName: 'Ada',
  bodyPreview: 'Please review the launch plan',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

function renderToast(overrides: { onOpen?: () => void; onDismiss?: () => void } = {}) {
  const onOpen = overrides.onOpen ?? jest.fn();
  const onDismiss = overrides.onDismiss ?? jest.fn();

  render(<NotificationToast notification={NOTIFICATION} onOpen={onOpen} onDismiss={onDismiss} />);

  return { onOpen, onDismiss };
}

describe('NotificationToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('announces the comment and forwards the actions', () => {
    const { onOpen, onDismiss } = renderToast();

    const toast = screen.getByRole('status', { name: 'New comment notification' });
    expect(toast).toHaveTextContent('Ada commented on Roadmap');
    expect(toast).toHaveTextContent('Please review the launch plan');

    fireEvent.click(screen.getByRole('button', { name: 'Open comment' }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself after six seconds', () => {
    const { onDismiss } = renderToast();

    act(() => {
      jest.advanceTimersByTime(5999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses while hovered and resumes when the pointer leaves', () => {
    const { onDismiss } = renderToast();
    const toast = screen.getByRole('status', { name: 'New comment notification' });

    fireEvent.mouseEnter(toast);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses while focused and resumes when focus leaves', () => {
    const { onDismiss } = renderToast();
    const toast = screen.getByRole('status', { name: 'New comment notification' });

    fireEvent.focus(toast);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.blur(toast, { relatedTarget: null });
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
