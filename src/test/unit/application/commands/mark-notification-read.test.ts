import { createMarkNotificationRead } from '../../../../application/commands/mark-notification-read';
import { Notification } from '../../../../domain/notification';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeNotificationRepository } from '../../../fixtures/fake-notification-repository';

const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');
const READ_AT = new Date('2026-10-23T10:05:00.000Z');
const RECIPIENT = UserId.create('user-2');

function makeNotification(): Notification {
  return Notification.create({
    id: NotificationId.create('comment-1_user-2'),
    type: 'comment',
    recipientId: RECIPIENT,
    workspaceId: WorkspaceId.create('ws-1'),
    workspaceName: 'Roadmap',
    elementId: ElementId.create('el-1'),
    commentId: CommentId.create('comment-1'),
    actorId: UserId.create('user-1'),
    actorName: 'Ada',
    bodyPreview: 'Looks good',
    createdAt: CREATED_AT,
  });
}

describe('createMarkNotificationRead', () => {
  it('marks an unread notification of the recipient as read', async () => {
    const repository = new FakeNotificationRepository();
    await repository.create(makeNotification());
    const markRead = createMarkNotificationRead({
      repository,
      now: () => READ_AT,
    });

    const result = await markRead({
      notificationId: 'comment-1_user-2',
      recipientId: RECIPIENT.value,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.notification.isRead()).toBe(true);
    expect(result.notification.readAt).toEqual(READ_AT);
    expect((await repository.findById(NotificationId.create('comment-1_user-2')))?.readAt).toEqual(
      READ_AT,
    );
  });

  it('returns notFound for an unknown notification', async () => {
    const markRead = createMarkNotificationRead({
      repository: new FakeNotificationRepository(),
    });

    const result = await markRead({
      notificationId: 'missing',
      recipientId: RECIPIENT.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    }
  });

  it('forbids marking another recipient notification as read', async () => {
    const repository = new FakeNotificationRepository();
    await repository.create(makeNotification());
    const markRead = createMarkNotificationRead({ repository });

    const result = await markRead({
      notificationId: 'comment-1_user-2',
      recipientId: 'someone-else',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'authorization',
        code: ERROR_CODES.AUTH_FORBIDDEN,
      });
    }
  });

  it('keeps an already read notification unchanged', async () => {
    const repository = new FakeNotificationRepository();
    await repository.create(makeNotification().markRead(READ_AT));
    const markRead = createMarkNotificationRead({ repository });

    const result = await markRead({
      notificationId: 'comment-1_user-2',
      recipientId: RECIPIENT.value,
      readAt: new Date('2026-10-23T11:00:00.000Z'),
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.notification.readAt).toEqual(READ_AT);
    }
  });
});
