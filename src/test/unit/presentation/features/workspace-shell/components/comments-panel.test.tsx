import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CommentServices } from '../../../../../../application/comment-services';
import { Comment } from '../../../../../../domain/comment';
import { createNoteElement } from '../../../../../../domain/element';
import {
  CommentId,
  ElementId,
  Position,
  Size,
  UserId,
  WorkspaceId,
} from '../../../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { render } from '../../../../../setup/render-with-theme';
import { CommentsPanel } from '../../../../../../presentation/features/workspace-shell/components/comments-panel';

const WORKSPACE_ID = 'ws-1';
const ELEMENT_ID = 'el-1';
const CURRENT_USER = 'user-1';

function makeElement() {
  return createNoteElement({
    id: ElementId.create(ELEMENT_ID),
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    createdBy: UserId.create(CURRENT_USER),
    position: Position.create(0, 0),
    size: Size.create(200, 120),
    content: 'Planning note',
    createdAt: new Date('2026-10-20T09:00:00.000Z'),
  });
}

function makeComment(
  id = 'comment-1',
  overrides: Partial<Parameters<typeof Comment.create>[0]> = {},
): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    elementId: ElementId.create(ELEMENT_ID),
    authorId: UserId.create(CURRENT_USER),
    body: 'Looks good to me',
    createdAt: new Date('2026-10-20T10:00:00.000Z'),
    ...overrides,
  });
}

function makeServices(overrides: Partial<CommentServices> = {}): CommentServices {
  return {
    listWorkspaceComments: jest.fn().mockResolvedValue({ status: 'ok', comments: [] }),
    listComments: jest.fn().mockResolvedValue({ status: 'ok', comments: [] }),
    createComment: jest.fn(),
    resolveComment: jest.fn(),
    ...overrides,
  };
}

function renderPanel(overrides: Partial<Parameters<typeof CommentsPanel>[0]> = {}) {
  return render(
    <CommentsPanel
      open
      workspaceId={WORKSPACE_ID}
      element={makeElement()}
      currentUserId={CURRENT_USER}
      authorLabels={new Map([[CURRENT_USER, 'Ada']])}
      services={makeServices()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );
}

describe('CommentsPanel', () => {
  it('asks to select one element when there is no target', () => {
    renderPanel({ element: undefined });

    expect(screen.getByTestId('comments-panel')).toBeInTheDocument();
    expect(screen.getByTestId('comments-panel').tagName).toBe('ASIDE');
    expect(screen.getByText('Select an element')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Comment' })).not.toBeInTheDocument();
  });

  it('loads and renders existing comments with author labels and target', async () => {
    const comment = makeComment();
    renderPanel({
      services: makeServices({
        listComments: jest.fn().mockResolvedValue({ status: 'ok', comments: [comment] }),
      }),
    });

    expect(await screen.findByText('Looks good to me')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Note: Planning note')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-comment-1')).toHaveAttribute('data-resolved', 'false');
    expect(screen.getByTestId('comment-card-comment-1').tagName).toBe('LI');
  });

  it('creates a comment and appends it to the list', async () => {
    const created = makeComment('comment-new', { body: 'New comment' });
    const createComment = jest.fn().mockResolvedValue({ status: 'ok', comment: created });
    const onCommentSaved = jest.fn();
    renderPanel({ services: makeServices({ createComment }), onCommentSaved });
    const user = userEvent.setup();

    await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument());

    const textbox = screen.getByRole('textbox', { name: 'Comment' });
    await user.type(textbox, 'New comment');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    await waitFor(() => expect(screen.getByText('New comment')).toBeInTheDocument());
    expect(createComment).toHaveBeenCalledWith({
      workspaceId: expect.objectContaining({ value: WORKSPACE_ID }),
      elementId: expect.objectContaining({ value: ELEMENT_ID }),
      authorId: expect.objectContaining({ value: CURRENT_USER }),
      body: 'New comment',
    });
    expect(onCommentSaved).toHaveBeenCalledWith(created);
    expect(textbox).toHaveValue('');
  });

  it('resolves an open comment and keeps it visible as resolved', async () => {
    const comment = makeComment();
    const resolvedAt = new Date('2026-10-20T11:00:00.000Z');
    const resolveComment = jest.fn().mockResolvedValue({
      status: 'ok',
      comment: comment.resolve(resolvedAt),
    });
    const onCommentSaved = jest.fn();
    renderPanel({
      onCommentSaved,
      services: makeServices({
        listComments: jest.fn().mockResolvedValue({ status: 'ok', comments: [comment] }),
        resolveComment,
      }),
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Resolve' }));

    expect(resolveComment).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      commentId: 'comment-1',
    });
    expect(await screen.findByText('Resolved')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-comment-1')).toHaveAttribute('data-resolved', 'true');
    expect(onCommentSaved).toHaveBeenCalledWith(expect.objectContaining({ resolvedAt }));
    expect(screen.getByText('Looks good to me')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('does not show a resolve action for already resolved comments', async () => {
    renderPanel({
      services: makeServices({
        listComments: jest.fn().mockResolvedValue({
          status: 'ok',
          comments: [makeComment().resolve(new Date('2026-10-20T11:00:00.000Z'))],
        }),
      }),
    });

    expect(await screen.findByText('Resolved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('shows an empty state when the element has no comments', async () => {
    renderPanel();

    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
  });

  it('shows a load error and retries', async () => {
    const listComments = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'error',
        error: createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'Denied'),
      })
      .mockResolvedValueOnce({ status: 'ok', comments: [] });
    renderPanel({ services: makeServices({ listComments }) });

    expect(await screen.findByText('We could not load the comments')).toBeInTheDocument();
    expect(
      screen.getByText('You do not have permission to access these comments.'),
    ).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
    expect(listComments).toHaveBeenCalledTimes(2);
  });

  it('shows a create error without dropping the draft', async () => {
    const createComment = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'Oops'),
    });
    renderPanel({ services: makeServices({ createComment }) });
    const user = userEvent.setup();

    await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Keep me');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByText('We could not add your comment.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('Keep me');
  });

  it('closes from the shared panel header', async () => {
    const onClose = jest.fn();
    renderPanel({ onClose });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Close comments' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the short user id when there is no author label', async () => {
    const authorId = '1234567890abcdef';
    renderPanel({
      authorLabels: new Map(),
      services: makeServices({
        listComments: jest.fn().mockResolvedValue({
          status: 'ok',
          comments: [makeComment('comment-1', { authorId: UserId.create(authorId) })],
        }),
      }),
    });

    expect(await screen.findByText('90abcdef')).toBeInTheDocument();
  });
});
