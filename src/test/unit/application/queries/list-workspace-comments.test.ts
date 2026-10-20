import { createListWorkspaceComments } from '../../../../application/queries';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';

const WORKSPACE = WorkspaceId.create('ws-1');
const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');

function makeComment(id: string, elementId: string): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WORKSPACE,
    elementId: ElementId.create(elementId),
    authorId: UserId.create('user-1'),
    body: `Comment ${id}`,
    createdAt: CREATED_AT,
  });
}

describe('createListWorkspaceComments', () => {
  it('lists comments across elements of the workspace', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment('first', 'el-1'));
    await repository.save(makeComment('second', 'el-2'));
    const listWorkspaceComments = createListWorkspaceComments(repository);

    const result = await listWorkspaceComments({ workspaceId: 'ws-1' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.comments.map((comment) => comment.id.value).sort()).toEqual([
        'first',
        'second',
      ]);
    }
  });

  it('returns repository errors', async () => {
    const failure: AppError = createAppError(
      'authorization',
      ERROR_CODES.AUTH_FORBIDDEN,
      'Not allowed',
    );
    const repository = new FakeCommentRepository();
    repository.listByWorkspace = jest.fn().mockRejectedValue(failure);
    const listWorkspaceComments = createListWorkspaceComments(repository);

    const result = await listWorkspaceComments({ workspaceId: 'ws-1' });

    expect(result).toEqual({ status: 'error', error: failure });
  });

  it('returns a validation AppError for invalid workspaces', async () => {
    const listWorkspaceComments = createListWorkspaceComments(new FakeCommentRepository());

    const result = await listWorkspaceComments({ workspaceId: '  ' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    }
  });
});
