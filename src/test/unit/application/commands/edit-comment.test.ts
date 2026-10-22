import { createEditComment } from '../../../../application/commands';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';

const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const EDITED_AT = new Date('2026-10-20T10:10:00.000Z');

function makeComment(): Comment {
  return Comment.create({
    id: CommentId.create('comment-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create('el-1'),
    authorId: UserId.create('user-1'),
    body: 'Please review',
    createdAt: CREATED_AT,
  });
}

describe('createEditComment', () => {
  it('edits a comment owned by the actor within the window', async () => {
    const repository = new FakeCommentRepository();
    const comment = await repository.save(makeComment());
    const editComment = createEditComment({ repository, now: () => EDITED_AT });

    const result = await editComment({
      workspaceId: 'ws-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      body: '  Updated text  ',
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.comment.body).toBe('Updated text');
    expect(result.comment.editedAt).toEqual(EDITED_AT);
    expect(comment.body).toBe('Please review');
    expect(
      (await repository.findById(WorkspaceId.create('ws-1'), CommentId.create('comment-1')))
        ?.editedAt,
    ).toEqual(EDITED_AT);
  });

  it('returns not found for an unknown comment', async () => {
    const editComment = createEditComment({ repository: new FakeCommentRepository() });

    const result = await editComment({
      workspaceId: 'ws-1',
      commentId: 'missing',
      actorId: 'user-1',
      body: 'Updated',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    }
  });

  it('returns authorization when a different user edits', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment());
    const editComment = createEditComment({ repository, now: () => EDITED_AT });

    const result = await editComment({
      workspaceId: 'ws-1',
      commentId: 'comment-1',
      actorId: 'user-2',
      body: 'Updated',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'authorization',
        code: ERROR_CODES.AUTH_FORBIDDEN,
      });
    }
  });

  it('returns validation when editing outside the window or resolved', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment());
    const editComment = createEditComment({
      repository,
      now: () => new Date(CREATED_AT.getTime() + 16 * 60 * 1000),
    });

    const result = await editComment({
      workspaceId: 'ws-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      body: 'Updated',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('propagates repository errors', async () => {
    const failure: AppError = createAppError(
      'persistence',
      ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      'Write failed',
    );
    const repository = new FakeCommentRepository();
    repository.findById = jest.fn().mockRejectedValue(failure);
    const editComment = createEditComment({ repository });

    const result = await editComment({
      workspaceId: 'ws-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      body: 'Updated',
    });

    expect(result).toEqual({ status: 'error', error: failure });
  });
});
