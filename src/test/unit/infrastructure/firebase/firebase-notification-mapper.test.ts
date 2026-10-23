import { Notification } from '../../../../domain/notification';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../domain/shared';
import {
  fromNotificationDocument,
  toNotificationDocument,
} from '../../../../infrastructure/firebase/firebase-notification-mapper';

const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');
const READ_AT = new Date('2026-10-23T10:05:00.000Z');

function makeNotification(): Notification {
  return Notification.create({
    id: NotificationId.create('comment-1_user-2'),
    type: 'comment',
    recipientId: UserId.create('user-2'),
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

describe('firebase notification mapper', () => {
  it('maps a notification to a document and back', () => {
    const notification = makeNotification();

    const document = toNotificationDocument(notification);
    const restored = fromNotificationDocument(document);

    expect(document).toEqual({
      id: 'comment-1_user-2',
      type: 'comment',
      recipientId: 'user-2',
      workspaceId: 'ws-1',
      workspaceName: 'Roadmap',
      elementId: 'el-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      actorName: 'Ada',
      bodyPreview: 'Looks good',
      createdAt: CREATED_AT,
    });
    expect(restored.id.equals(notification.id)).toBe(true);
    expect(restored.isRead()).toBe(false);
  });

  it('omits readAt when unread and reads it when present', () => {
    const notification = makeNotification();

    expect(toNotificationDocument(notification)).not.toHaveProperty('readAt');

    const restored = fromNotificationDocument({
      ...toNotificationDocument(notification),
      readAt: { toDate: () => READ_AT },
    });

    expect(restored.readAt).toEqual(READ_AT);
  });

  it('rejects malformed documents', () => {
    expect(() => fromNotificationDocument(null)).toThrow('Notification document must be an object');
    expect(() =>
      fromNotificationDocument({ ...toNotificationDocument(makeNotification()), type: 'other' }),
    ).toThrow('Notification document field "type" must be "comment"');
    expect(() =>
      fromNotificationDocument({ ...toNotificationDocument(makeNotification()), actorName: 1 }),
    ).toThrow('Notification document field "actorName" must be a string');
  });
});
