import type { NotificationRepository } from '../../application/ports';
import { Notification } from '../../domain/notification';
import { CommentId, ElementId, NotificationId, UserId, WorkspaceId } from '../../domain/shared';

type RepositoryFactory = () => NotificationRepository | Promise<NotificationRepository>;

const RECIPIENT = UserId.create('user-2');
const OTHER_RECIPIENT = UserId.create('user-3');
const ACTOR = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');
const READ_AT = new Date('2026-10-23T10:05:00.000Z');

function makeNotification(
  id: string,
  overrides: Partial<Parameters<typeof Notification.create>[0]> = {},
): Notification {
  return Notification.create({
    id: NotificationId.create(id),
    type: 'comment',
    recipientId: RECIPIENT,
    workspaceId: WORKSPACE,
    workspaceName: 'Roadmap',
    elementId: ElementId.create('el-1'),
    commentId: CommentId.create(`comment-${id}`),
    actorId: ACTOR,
    actorName: 'Ada',
    bodyPreview: 'Looks good',
    createdAt: CREATED_AT,
    ...overrides,
  });
}

export function describeNotificationRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: NotificationRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts empty for a recipient', async () => {
      await expect(repository.listByRecipient(RECIPIENT)).resolves.toEqual([]);
      expect(await repository.findById(NotificationId.create('missing'))).toBeNull();
    });

    it('stores a notification and exposes it through findById and listByRecipient', async () => {
      const notification = makeNotification('notification-1');

      const created = await repository.create(notification);

      expect(created).toBe(notification);
      const found = await repository.findById(notification.id);
      expect(found?.id.equals(notification.id)).toBe(true);
      const listed = await repository.listByRecipient(RECIPIENT);
      expect(listed.map((entry) => entry.id.value)).toEqual(['notification-1']);
    });

    it('stores a batch and filters by recipient in descending creation order', async () => {
      const older = makeNotification('older', { createdAt: CREATED_AT });
      const newer = makeNotification('newer', {
        createdAt: new Date('2026-10-23T11:00:00.000Z'),
      });
      const other = makeNotification('other', { recipientId: OTHER_RECIPIENT });

      await repository.createMany([older, newer, other]);

      const listed = await repository.listByRecipient(RECIPIENT);
      expect(listed.map((entry) => entry.id.value)).toEqual(['newer', 'older']);
      expect(
        (await repository.listByRecipient(OTHER_RECIPIENT)).map((entry) => entry.id.value),
      ).toEqual(['other']);
    });

    it('is idempotent for the same deterministic notification id', async () => {
      const notification = makeNotification('same-id');

      await repository.create(notification);
      await repository.create(notification);

      expect(await repository.listByRecipient(RECIPIENT)).toHaveLength(1);
    });

    it('marks a notification as read', async () => {
      const notification = await repository.create(makeNotification('notification-1'));

      const updated = await repository.markRead(notification.id, READ_AT);

      expect(updated.isRead()).toBe(true);
      expect(updated.readAt).toEqual(READ_AT);
      expect((await repository.findById(notification.id))?.readAt).toEqual(READ_AT);
    });

    it('rejects marking an unknown notification as read with notFound', async () => {
      const error: unknown = await repository
        .markRead(NotificationId.create('missing'), READ_AT)
        .catch((reason: unknown) => reason);

      expect(error).toMatchObject({ kind: 'notFound' });
    });

    it('watches the recipient notifications', async () => {
      const listener = jest.fn();
      const notification = makeNotification('watched');
      await repository.create(notification);

      const unsubscribe = repository.watchByRecipient(RECIPIENT, listener);

      const notifications = listener.mock.calls.at(-1)?.[0] as readonly Notification[];
      expect(notifications.map((entry) => entry.id.value)).toContain('watched');
      unsubscribe();
    });
  });
}
