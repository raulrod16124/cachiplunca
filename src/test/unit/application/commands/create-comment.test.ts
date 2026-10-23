import { createCreateComment } from '../../../../application/commands';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';

const NOW = new Date('2026-10-20T10:00:00.000Z');

function makeInput(overrides: Partial<Parameters<ReturnType<typeof createCreateComment>>[0]> = {}) {
  return {
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create('el-1'),
    authorId: UserId.create('user-1'),
    body: 'Nice work',
    ...overrides,
  };
}

describe('createCreateComment', () => {
  it('creates and persists a trimmed comment with the generated id', async () => {
    const repository = new FakeCommentRepository();
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      now: () => NOW,
    });

    const result = await createComment(makeInput({ body: '  Nice work  ' }));

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.comment.id.value).toBe('comment-1');
    expect(result.comment.body).toBe('Nice work');
    expect(result.comment.createdAt).toEqual(NOW);
    expect(result.comment.resolvedAt).toBeUndefined();
    expect(await repository.findById(WorkspaceId.create('ws-1'), result.comment.id)).toBe(
      result.comment,
    );
  });

  it('returns a validation error without persisting an empty body', async () => {
    const repository = new FakeCommentRepository();
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
    });

    const result = await createComment(makeInput({ body: '   ' }));

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    }
    expect(repository.list()).toHaveLength(0);
  });

  it('records workspace activity after saving the comment', async () => {
    const repository = new FakeCommentRepository();
    const recordActivity = jest.fn().mockResolvedValue(undefined);
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      recordActivity,
      now: () => NOW,
    });

    await createComment(makeInput());

    expect(recordActivity).toHaveBeenCalledWith(WorkspaceId.create('ws-1'), NOW);
  });

  it('treats a failed activity record as best-effort', async () => {
    const repository = new FakeCommentRepository();
    const recordActivity = jest.fn().mockRejectedValue(new Error('Activity failed'));
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      recordActivity,
      now: () => NOW,
    });

    const result = await createComment(makeInput());

    expect(result.status).toBe('ok');
    expect(recordActivity).toHaveBeenCalledTimes(1);
  });

  it('does not record activity when saving fails', async () => {
    const repository = new FakeCommentRepository();
    repository.save = jest.fn().mockRejectedValue(new Error('Write failed'));
    const recordActivity = jest.fn().mockResolvedValue(undefined);
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      recordActivity,
    });

    const result = await createComment(makeInput());

    expect(result.status).toBe('error');
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('propagates repository errors without wrapping them again', async () => {
    const failure: AppError = createAppError(
      'authorization',
      ERROR_CODES.AUTH_FORBIDDEN,
      'Not allowed',
    );
    const repository = new FakeCommentRepository();
    repository.save = jest.fn().mockRejectedValue(failure);
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
    });

    const result = await createComment(makeInput());

    expect(result).toEqual({ status: 'error', error: failure });
  });

  it('notifies other members with the saved comment and actor name', async () => {
    const repository = new FakeCommentRepository();
    const notifyComment = jest.fn().mockResolvedValue({ status: 'ok', created: 1 });
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      notifyComment,
      now: () => NOW,
    });

    const result = await createComment(makeInput({ actorName: 'Ada' }));

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(notifyComment).toHaveBeenCalledWith({
      comment: result.comment,
      actorName: 'Ada',
    });
  });

  it('treats a failed notification as best-effort', async () => {
    const repository = new FakeCommentRepository();
    const notifyComment = jest.fn().mockRejectedValue(new Error('Notification failed'));
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      notifyComment,
    });

    const result = await createComment(makeInput());

    expect(result.status).toBe('ok');
    expect(repository.list()).toHaveLength(1);
    expect(notifyComment).toHaveBeenCalledTimes(1);
  });

  it('does not notify when saving the comment fails', async () => {
    const repository = new FakeCommentRepository();
    repository.save = jest.fn().mockRejectedValue(new Error('Write failed'));
    const notifyComment = jest.fn();
    const createComment = createCreateComment({
      repository,
      generateId: () => CommentId.create('comment-1'),
      notifyComment,
    });

    await createComment(makeInput());

    expect(notifyComment).not.toHaveBeenCalled();
  });
});
