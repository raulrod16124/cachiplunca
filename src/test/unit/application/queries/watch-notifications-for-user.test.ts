import { createWatchNotificationsForUser } from '../../../../application/queries';
import { Notification } from '../../../../domain/notification';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeNotificationRepository } from '../../../fixtures/fake-notification-repository';

const RECIPIENT = UserId.create('user-2');
const ACTOR = UserId.create('user-1');

function makeNotification(id: string, createdAt: string, recipient = RECIPIENT): Notification {
  return Notification.create({
    id: NotificationId.create(id),
    type: 'comment',
    recipientId: recipient,
    workspaceId: WorkspaceId.create('ws-1'),
    workspaceName: 'Roadmap',
    elementId: ElementId.create('el-1'),
    commentId: CommentId.create(`comment-${id}`),
    actorId: ACTOR,
    actorName: 'Ada',
    bodyPreview: 'Looks good',
    createdAt: new Date(createdAt),
  });
}

describe('createWatchNotificationsForUser', () => {
  it('watches only the recipient notifications in descending order', async () => {
    const repository = new FakeNotificationRepository();
    await repository.create(makeNotification('older', '2026-10-23T09:00:00.000Z'));
    await repository.create(makeNotification('newer', '2026-10-23T11:00:00.000Z'));
    await repository.create(
      makeNotification('other', '2026-10-23T12:00:00.000Z', UserId.create('other-user')),
    );
    const watch = createWatchNotificationsForUser(repository);
    const listener = jest.fn();

    const unsubscribe = watch(RECIPIENT.value, listener);

    const notifications = listener.mock.calls[0]?.[0] as readonly Notification[];
    expect(notifications.map((notification) => notification.id.value)).toEqual(['newer', 'older']);
    unsubscribe();
  });

  it('emits an empty list for a blank user id', () => {
    const watch = createWatchNotificationsForUser(new FakeNotificationRepository());
    const listener = jest.fn();

    watch('   ', listener);

    expect(listener).toHaveBeenCalledWith([]);
  });

  it('forwards repository errors as AppErrors', () => {
    const repository = new FakeNotificationRepository();
    const failure = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'Not allowed');
    repository.watchByRecipient = jest.fn((_userId, _listener, onError) => {
      onError?.(failure);
      return () => undefined;
    });
    const watch = createWatchNotificationsForUser(repository);
    const onError = jest.fn();

    watch(RECIPIENT.value, jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});
