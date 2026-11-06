import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createNoteElement } from '../../domain/element';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function createNote(workspace: Workspace, createdBy: UserId) {
  return createNoteElement({
    id: ElementId.create('note-1'),
    workspaceId: workspace.id,
    createdBy,
    position: Position.create(0, 0),
    size: Size.create(200, 120),
    content: 'Discuss the launch',
    createdAt: new Date('2026-10-23T09:00:00.000Z'),
  });
}

describe('comment notifications', () => {
  it('notifies other members and deep links to the highlighted comment', async () => {
    const harness = createAppHarness();
    const owner = await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Notification board');
    const ownerId = UserId.create(owner.uid);
    await harness.elementRepository.save(createNote(workspace, ownerId));

    const member = await harness.authPort.signUp({
      email: 'member@example.com',
      password: 'Secret123',
      displayName: 'Member User',
    });
    await harness.membershipRepository.create({
      userId: UserId.create(member.uid),
      workspaceId: workspace.id,
      role: 'editor',
    });

    const created = await harness.services.comments?.createComment({
      workspaceId: workspace.id,
      elementId: ElementId.create('note-1'),
      authorId: ownerId,
      body: 'Please review the launch plan',
      actorName: owner.displayName ?? undefined,
    });
    expect(created?.status).toBe('ok');
    await waitFor(() => {
      expect(harness.notificationRepository.list()).toHaveLength(1);
    });

    harness.authPort.setSession({ ...member, emailVerified: true });
    harness.render({ initialPath: '/workspaces' });

    const trigger = await screen.findByRole('button', { name: /Notifications, 1 unread/i });
    expect(
      screen.queryByRole('status', { name: 'New comment notification' }),
    ).not.toBeInTheDocument();
    await userEvent.setup().click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(within(dialog).getByRole('tab', { name: 'Comments' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const row = within(dialog).getByTestId('comment-notification-row');
    expect(row).toHaveAccessibleName(/commented on Notification board/i);
    await userEvent.setup().click(row);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/workspaces/${workspace.id.value}`);
    });
    expect(await screen.findByTestId('comments-panel')).toBeInTheDocument();

    const commentId = harness.notificationRepository.list()[0]?.commentId.value;
    expect(commentId).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId(`comment-card-${commentId ?? ''}`)).toHaveAttribute(
        'data-highlighted',
        'true',
      );
    });
    await waitFor(() => {
      expect(harness.notificationRepository.list()[0]?.isRead()).toBe(true);
    });
  });

  async function setupMemberScenario(): Promise<{
    harness: ReturnType<typeof createAppHarness>;
    workspace: Workspace;
    ownerId: UserId;
  }> {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Toast board');
    const ownerId = UserId.create(owner.uid);
    await harness.elementRepository.save(createNote(workspace, ownerId));

    const member = await harness.authPort.signUp({
      email: 'toast-member@example.com',
      password: 'Secret123',
      displayName: 'Toast Member',
    });
    await harness.membershipRepository.create({
      userId: UserId.create(member.uid),
      workspaceId: workspace.id,
      role: 'editor',
    });

    harness.authPort.setSession({ ...member, emailVerified: true });
    harness.render({ initialPath: '/workspaces' });
    await screen.findByText('Cachiplunca');

    return { harness, workspace, ownerId };
  }

  async function addComment(
    harness: ReturnType<typeof createAppHarness>,
    workspace: Workspace,
    ownerId: UserId,
    body: string,
  ): Promise<void> {
    await act(async () => {
      const created = await harness.services.comments?.createComment({
        workspaceId: workspace.id,
        elementId: ElementId.create('note-1'),
        authorId: ownerId,
        body,
        actorName: 'Owner',
      });
      expect(created?.status).toBe('ok');
    });
  }

  it('announces a new comment in a top-center toast and opens the comment', async () => {
    const { harness, workspace, ownerId } = await setupMemberScenario();
    const body = 'Please review the toast copy';

    await addComment(harness, workspace, ownerId, body);

    const toast = await screen.findByRole('status', { name: 'New comment notification' });
    expect(toast).toHaveTextContent(/commented on Toast board/i);
    expect(toast).toHaveTextContent(body);

    await userEvent.setup().click(within(toast).getByRole('button', { name: 'Open comment' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/workspaces/${workspace.id.value}`);
    });
    expect(await screen.findByTestId('comments-panel')).toBeInTheDocument();
    await waitFor(() => {
      expect(harness.notificationRepository.list()[0]?.isRead()).toBe(true);
    });
  });

  it('dismisses the toast without marking the notification as read', async () => {
    const { harness, workspace, ownerId } = await setupMemberScenario();

    await addComment(harness, workspace, ownerId, 'Review this later');

    const toast = await screen.findByRole('status', { name: 'New comment notification' });
    await userEvent
      .setup()
      .click(within(toast).getByRole('button', { name: 'Dismiss notification' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('status', { name: 'New comment notification' }),
      ).not.toBeInTheDocument();
    });
    expect(harness.notificationRepository.list()[0]?.isRead()).toBe(false);
    expect(screen.getByRole('button', { name: /Notifications, 1 unread/i })).toBeInTheDocument();
  });
});
