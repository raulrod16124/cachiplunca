import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createNoteElement } from '../../domain/element';
import { CommentId, ElementId, Position, Size, UserId } from '../../domain/shared';
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
    createdAt: new Date('2026-10-20T09:00:00.000Z'),
  });
}

async function selectNoteAndOpenComments(): Promise<void> {
  const note = await screen.findByTestId('canvas-item-note-1');
  await userEvent.setup().click(note);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Comments' }));
}

describe('comments integration', () => {
  beforeEach(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('creates comments, keeps them after a reload and resolves them', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Comments board');
    const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');
    await harness.elementRepository.save(createNote(workspace, createdBy));

    const first = harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await selectNoteAndOpenComments();

    const user = userEvent.setup();
    await user.type(
      await screen.findByRole('textbox', { name: 'Comment' }),
      'Let us ship on Friday',
    );
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByText('Let us ship on Friday')).toBeInTheDocument();
    const indicator = await screen.findByTestId('comment-indicator-note-1');
    expect(indicator).toHaveTextContent('1');
    await userEvent.setup().click(indicator);
    expect(screen.getByTestId('comments-panel')).toBeInTheDocument();
    await waitFor(async () => {
      const comments = await harness.commentRepository.listByElement(
        workspace.id,
        ElementId.create('note-1'),
      );
      expect(comments).toHaveLength(1);
    });

    first.unmount();
    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await selectNoteAndOpenComments();

    expect(await screen.findByText('Let us ship on Friday')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Resolve' }));

    expect(await screen.findByText('Resolved')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId('comment-indicator-note-1')).not.toBeInTheDocument(),
    );
    await waitFor(async () => {
      const comment = await harness.commentRepository.findById(
        workspace.id,
        CommentId.create('comment-1'),
      );
      expect(comment?.isResolved()).toBe(true);
    });
  });

  it('edits own comment and persists it', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Comments board');
    const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');
    await harness.elementRepository.save(createNote(workspace, createdBy));

    const first = harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await selectNoteAndOpenComments();

    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: 'Comment' }), 'Draft');
    await user.click(await screen.findByRole('button', { name: 'Add comment' }));
    expect(await screen.findByText('Draft')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const textarea = screen.getByRole('textbox', { name: 'Edit comment' });
    await user.clear(textarea);
    await user.type(textarea, 'Revised');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Revised')).toBeInTheDocument();
    expect(await screen.findByText(/Edited/)).toBeInTheDocument();

    first.unmount();
    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await selectNoteAndOpenComments();
    expect(await screen.findByText('Revised')).toBeInTheDocument();
    await waitFor(async () => {
      const comment = await harness.commentRepository.findById(
        workspace.id,
        CommentId.create('comment-1'),
      );
      expect(comment?.body).toBe('Revised');
      expect(comment?.isEdited()).toBe(true);
    });
  });

  it('lets a viewer comment without granting canvas editing', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const currentUserId = UserId.create(harness.currentUser?.uid ?? 'user-1');
    const workspace = await harness.workspaceRepository.create({
      name: 'Viewer comments',
      createdBy: UserId.create('other-owner'),
    });
    await harness.membershipRepository.create({
      userId: currentUserId,
      workspaceId: workspace.id,
      role: 'viewer',
    });
    await harness.elementRepository.save(
      createNoteElement({
        id: ElementId.create('note-1'),
        workspaceId: workspace.id,
        createdBy: currentUserId,
        position: Position.create(0, 0),
        size: Size.create(200, 120),
        content: 'Viewer note',
        createdAt: new Date('2026-10-20T09:00:00.000Z'),
      }),
    );

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await selectNoteAndOpenComments();

    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: 'Comment' }), 'Viewer feedback');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByText('Viewer feedback')).toBeInTheDocument();
    expect(await screen.findByTestId('comment-indicator-note-1')).toHaveTextContent('1');
    expect(screen.getByText('Viewer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();
  });
});
