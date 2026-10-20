import { createListComments, sortComments } from '../../../../application/queries';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { FakeCommentRepository } from '../../../fixtures/fake-comment-repository';

const WORKSPACE = WorkspaceId.create('ws-1');
const ELEMENT = ElementId.create('el-1');
const AUTHOR = UserId.create('user-1');

function makeComment(
  id: string,
  createdAt: string,
  overrides: Partial<Parameters<typeof Comment.create>[0]> = {},
): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WORKSPACE,
    elementId: ELEMENT,
    authorId: AUTHOR,
    body: `Comment ${id}`,
    createdAt: new Date(createdAt),
    ...overrides,
  });
}

describe('createListComments', () => {
  it('lists only comments of the requested element sorted by creation time', async () => {
    const repository = new FakeCommentRepository();
    await repository.save(makeComment('b', '2026-10-20T10:00:00.000Z'));
    await repository.save(makeComment('a', '2026-10-20T10:00:00.000Z'));
    await repository.save(makeComment('later', '2026-10-20T12:00:00.000Z'));
    await repository.save(
      makeComment('other-element', '2026-10-20T09:00:00.000Z', {
        elementId: ElementId.create('el-2'),
      }),
    );
    await repository.save(
      makeComment('other-workspace', '2026-10-20T09:00:00.000Z', {
        workspaceId: WorkspaceId.create('ws-2'),
      }),
    );
    const listComments = createListComments(repository);

    const result = await listComments({ workspaceId: 'ws-1', elementId: 'el-1' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.comments.map((comment) => comment.id.value)).toEqual(['a', 'b', 'later']);
    }
  });

  it('does not mutate the repository list when sorting', () => {
    const later = makeComment('later', '2026-10-20T12:00:00.000Z');
    const earlier = makeComment('earlier', '2026-10-20T09:00:00.000Z');
    const input = [later, earlier];

    const sorted = sortComments(input);

    expect(sorted).not.toBe(input);
    expect(sorted.map((comment) => comment.id.value)).toEqual(['earlier', 'later']);
    expect(input.map((comment) => comment.id.value)).toEqual(['later', 'earlier']);
  });

  it('returns repository errors', async () => {
    const failure: AppError = createAppError(
      'authorization',
      ERROR_CODES.AUTH_FORBIDDEN,
      'Not allowed',
    );
    const repository = new FakeCommentRepository();
    repository.listByElement = jest.fn().mockRejectedValue(failure);
    const listComments = createListComments(repository);

    const result = await listComments({ workspaceId: 'ws-1', elementId: 'el-1' });

    expect(result).toEqual({ status: 'error', error: failure });
  });

  it('returns a validation AppError for invalid identifiers', async () => {
    const listComments = createListComments(new FakeCommentRepository());

    const result = await listComments({ workspaceId: '  ', elementId: 'el-1' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    }
  });
});
