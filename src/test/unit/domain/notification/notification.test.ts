import {
  NOTIFICATION_ACTOR_NAME_MAX_LENGTH,
  NOTIFICATION_BODY_PREVIEW_MAX_LENGTH,
  Notification,
} from '../../../../domain/notification';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../domain/shared';

const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

function makeNotification(
  overrides: Partial<Parameters<typeof Notification.create>[0]> = {},
): Notification {
  return Notification.create({
    id: NotificationId.create('comment-1_user-2'),
    type: 'comment',
    recipientId: UserId.create('user-2'),
    workspaceId: WorkspaceId.create('ws-1'),
    workspaceName: 'Roadmap',
    elementId: ElementId.create('el-1'),
    commentId: CommentId.create('comment-1'),
    actorId: UserId.create('user-1'),
    actorName: 'Ada Lovelace',
    bodyPreview: 'Looks good to me',
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe('Notification', () => {
  it('creates a comment notification with normalized text', () => {
    const notification = makeNotification({
      actorName: '  Ada  ',
      bodyPreview: '  Looks good  ',
    });

    expect(notification.type).toBe('comment');
    expect(notification.recipientId.value).toBe('user-2');
    expect(notification.actorName).toBe('Ada');
    expect(notification.bodyPreview).toBe('Looks good');
    expect(notification.isRead()).toBe(false);
    expect(notification.readAt).toBeUndefined();
  });

  it('rejects a notification for the actor themselves', () => {
    expect(() => makeNotification({ recipientId: UserId.create('user-1') })).toThrow(
      'A user cannot receive a notification for their own action',
    );
  });

  it('rejects empty text and previews above the limit', () => {
    expect(() => makeNotification({ workspaceName: '   ' })).toThrow(
      'Workspace name cannot be empty',
    );
    expect(() => makeNotification({ actorName: '' })).toThrow('Actor name cannot be empty');
    expect(() =>
      makeNotification({ bodyPreview: 'x'.repeat(NOTIFICATION_BODY_PREVIEW_MAX_LENGTH + 1) }),
    ).toThrow(`Body preview cannot exceed ${NOTIFICATION_BODY_PREVIEW_MAX_LENGTH} characters`);
    expect(() =>
      makeNotification({ actorName: 'x'.repeat(NOTIFICATION_ACTOR_NAME_MAX_LENGTH + 1) }),
    ).toThrow(`Actor name cannot exceed ${NOTIFICATION_ACTOR_NAME_MAX_LENGTH} characters`);
  });

  it('marks a notification as read without mutating the original', () => {
    const notification = makeNotification();
    const readAt = new Date('2026-10-23T10:05:00.000Z');

    const read = notification.markRead(readAt);

    expect(read).not.toBe(notification);
    expect(notification.isRead()).toBe(false);
    expect(read.isRead()).toBe(true);
    expect(read.readAt).toEqual(readAt);
  });

  it('keeps the first read timestamp when marking twice', () => {
    const firstRead = new Date('2026-10-23T10:05:00.000Z');
    const notification = makeNotification().markRead(firstRead);

    const secondRead = notification.markRead(new Date('2026-10-23T10:10:00.000Z'));

    expect(secondRead).toBe(notification);
    expect(secondRead.readAt).toEqual(firstRead);
  });

  it('rejects a read timestamp before creation', () => {
    expect(() => makeNotification().markRead(new Date('2026-10-23T09:59:00.000Z'))).toThrow(
      'Read at cannot be before created at',
    );
  });
});
