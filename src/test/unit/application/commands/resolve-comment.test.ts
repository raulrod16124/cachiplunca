import { createResolveComment } from '../../../../application/commands';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';

const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const RESOLVED_AT = new Date('2026-10-20T11:00:00.000Z');

function makeComment(id = 'comment-1'): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create('el-1'),
    authorId: UserId.create('user-1'),
    body: 'Please review',
    createdAt: CREATED_AT,
  });
}

describe('createResolveComment', () => {
  it('resolves a stored comment and persists the resolved date', async () => {
    const repository = new FakeCommentRepository();
    const comment = await repository.save(makeComment());
    const resolveComment = createResolveComment({
      repository,
      now: () => RESOLVED_AT,
    });

    const result = await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.comment.isResolved()).toBe(true);
    expect(result.comment.resolvedAt).toEqual(RESOLVED_AT);
    expect(result.comment.body).toBe(comment.body);
    expect(
      (await repository.findById(WorkspaceId.create('ws-1'), CommentId.create('comment-1')))
        ?.resolvedAt,
    ).toEqual(RESOLVED_AT);
  });

  it('returns not found for an unknown comment', async () => {
    const resolveComment = createResolveComment({ repository: new FakeCommentRepository() });

    const result = await resolveComment({ workspaceId: 'ws-1', commentId: 'missing' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
        details: { commentId: 'missing' },
      });
    }
  });

  it('does not resolve an already resolved comment', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment().resolve(RESOLVED_AT));
    const resolveComment = createResolveComment({
      repository,
      now: () => new Date('2026-10-20T12:00:00.000Z'),
    });

    const result = await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    }
  });

  it('records workspace activity with the resolution time', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment());
    const recordActivity = jest.fn().mockResolvedValue(undefined);
    const resolveComment = createResolveComment({
      repository,
      recordActivity,
      now: () => RESOLVED_AT,
    });

    await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(recordActivity).toHaveBeenCalledWith(WorkspaceId.create('ws-1'), RESOLVED_AT);
  });

  it('does not record activity when the comment is not resolved', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment().resolve(RESOLVED_AT));
    const recordActivity = jest.fn().mockResolvedValue(undefined);
    const resolveComment = createResolveComment({ repository, recordActivity });

    await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('treats a failed activity record as best-effort', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment());
    const recordActivity = jest.fn().mockRejectedValue(new Error('Activity failed'));
    const resolveComment = createResolveComment({
      repository,
      recordActivity,
      now: () => RESOLVED_AT,
    });

    const result = await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(result.status).toBe('ok');
  });

  it('propagates repository errors', async () => {
    const failure: AppError = createAppError(
      'persistence',
      ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      'Write failed',
    );
    const repository = new FakeCommentRepository();
    repository.findById = jest.fn().mockRejectedValue(failure);
    const resolveComment = createResolveComment({ repository });

    const result = await resolveComment({ workspaceId: 'ws-1', commentId: 'comment-1' });

    expect(result).toEqual({ status: 'error', error: failure });
  });
});
