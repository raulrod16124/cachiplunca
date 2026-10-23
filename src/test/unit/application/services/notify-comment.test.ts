import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, NotificationId, UserId } from '../../../../domain/shared';
import { createNotifyComment } from '../../../../application/services/notify-comment';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeNotificationRepository } from '../../../fixtures/fake-notification-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const NOW = new Date('2026-10-23T10:00:00.000Z');
const OWNER = UserId.create('owner-1');
const EDITOR = UserId.create('editor-1');
const VIEWER = UserId.create('viewer-1');
const OUTSIDER = UserId.create('outsider-1');

async function setup() {
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const notificationRepository = new FakeNotificationRepository();
  const workspace = await workspaceRepository.create({
    name: 'Roadmap Q4',
    createdBy: OWNER,
  });
  await membershipRepository.create({
    userId: OWNER,
    workspaceId: workspace.id,
    role: 'owner',
  });
  await membershipRepository.create({
    userId: EDITOR,
    workspaceId: workspace.id,
    role: 'editor',
  });
  await membershipRepository.create({
    userId: VIEWER,
    workspaceId: workspace.id,
    role: 'viewer',
  });
  const comment = Comment.create({
    id: CommentId.create('comment-1'),
    workspaceId: workspace.id,
    elementId: ElementId.create('el-1'),
    authorId: OWNER,
    body: '  This   is a   comment  ',
    createdAt: NOW,
  });
  const notifyComment = createNotifyComment({
    notificationRepository,
    membershipRepository,
    workspaceRepository,
    now: () => NOW,
  });

  return {
    workspace,
    comment,
    membershipRepository,
    notificationRepository,
    notifyComment,
  };
}

describe('createNotifyComment', () => {
  it('creates one notification per other member and excludes the author', async () => {
    const { workspace, comment, notificationRepository, notifyComment } = await setup();

    const result = await notifyComment({ comment, actorName: 'Ada' });

    expect(result).toEqual({ status: 'ok', created: 2 });
    const notifications = notificationRepository.list();
    expect(notifications.map((notification) => notification.recipientId.value).sort()).toEqual([
      EDITOR.value,
      VIEWER.value,
    ]);
    expect(notifications[0]).toMatchObject({
      type: 'comment',
      workspaceId: workspace.id,
      workspaceName: 'Roadmap Q4',
      elementId: ElementId.create('el-1'),
      commentId: CommentId.create('comment-1'),
      actorId: OWNER,
      actorName: 'Ada',
      bodyPreview: 'This is a comment',
      createdAt: NOW,
      readAt: undefined,
    });
    expect(notifications.map((notification) => notification.id.value).sort()).toEqual(
      [`comment-1_${EDITOR.value}`, `comment-1_${VIEWER.value}`].sort(),
    );
  });

  it('uses the author id as a fallback name and truncates long previews', async () => {
    const { comment, notificationRepository, notifyComment } = await setup();
    const longComment = Comment.create({
      id: CommentId.create('comment-2'),
      workspaceId: comment.workspaceId,
      elementId: comment.elementId,
      authorId: OWNER,
      body: 'x'.repeat(200),
      createdAt: NOW,
    });

    await notifyComment({ comment: longComment });

    const notifications = notificationRepository.list();
    expect(notifications).toHaveLength(2);
    expect(notifications[0]?.actorName).toBe(OWNER.value);
    expect(notifications[0]?.bodyPreview).toHaveLength(140);
  });

  it('does nothing when the workspace no longer exists', async () => {
    const { comment } = await setup();
    const notifyComment = createNotifyComment({
      notificationRepository: new FakeNotificationRepository(),
      membershipRepository: new FakeMembershipRepository(),
      workspaceRepository: new FakeWorkspaceRepository(),
      now: () => NOW,
    });

    await expect(notifyComment({ comment })).resolves.toEqual({ status: 'ok', created: 0 });
  });

  it('returns an AppError when the batch write fails', async () => {
    const { comment, notificationRepository, notifyComment } = await setup();
    jest
      .spyOn(notificationRepository, 'createMany')
      .mockRejectedValueOnce(new Error('Batch failed'));

    const result = await notifyComment({ comment });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
    }
  });

  it('notifies every member of the workspace, including viewers', async () => {
    const { workspace, comment, membershipRepository, notificationRepository, notifyComment } =
      await setup();
    await membershipRepository.create({
      userId: OUTSIDER,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    await notifyComment({ comment });

    expect(
      notificationRepository
        .list()
        .some((notification) => notification.recipientId.equals(OUTSIDER)),
    ).toBe(true);
  });
});

describe('notification ids', () => {
  it('are deterministic for a comment and recipient pair', async () => {
    const { comment, notificationRepository, notifyComment } = await setup();

    await notifyComment({ comment });
    await notifyComment({ comment });

    expect(notificationRepository.list()).toHaveLength(2);
    expect(
      notificationRepository
        .list()
        .map((notification) => notification.id.value)
        .sort(),
    ).toEqual(
      [
        NotificationId.create(`comment-1_${EDITOR.value}`).value,
        NotificationId.create(`comment-1_${VIEWER.value}`).value,
      ].sort(),
    );
  });
});
