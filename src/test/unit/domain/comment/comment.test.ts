import { Comment, COMMENT_BODY_MAX_LENGTH } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';

const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');

function makeComment(overrides: Partial<Parameters<typeof Comment.create>[0]> = {}): Comment {
  return Comment.create({
    id: CommentId.create('comment-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create('el-1'),
    authorId: UserId.create('user-1'),
    body: 'Looks good to me',
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe('Comment', () => {
  it('creates a comment with normalized body and no resolved date', () => {
    const comment = makeComment({ body: '  Looks good to me  ' });

    expect(comment.id.value).toBe('comment-1');
    expect(comment.workspaceId.value).toBe('ws-1');
    expect(comment.elementId.value).toBe('el-1');
    expect(comment.authorId.value).toBe('user-1');
    expect(comment.body).toBe('Looks good to me');
    expect(comment.createdAt).toEqual(CREATED_AT);
    expect(comment.resolvedAt).toBeUndefined();
    expect(comment.isResolved()).toBe(false);
  });

  it('preserves internal newlines and rejects an empty body', () => {
    expect(makeComment({ body: 'Line one\nLine two' }).body).toBe('Line one\nLine two');
    expect(() => makeComment({ body: '   \n  ' })).toThrow('Comment body cannot be empty');
    expect(() => makeComment({ body: 42 as unknown as string })).toThrow(
      'Comment body cannot be empty',
    );
  });

  it('rejects bodies longer than the maximum length', () => {
    expect(() => makeComment({ body: 'a'.repeat(COMMENT_BODY_MAX_LENGTH + 1) })).toThrow(
      `Comment body cannot exceed ${COMMENT_BODY_MAX_LENGTH} characters`,
    );
    expect(makeComment({ body: 'a'.repeat(COMMENT_BODY_MAX_LENGTH) }).body).toHaveLength(
      COMMENT_BODY_MAX_LENGTH,
    );
  });

  it('rejects invalid creation timestamps', () => {
    expect(() => makeComment({ createdAt: new Date('invalid') })).toThrow(
      'Created at must be a valid Date instance',
    );
    expect(() => makeComment({ createdAt: 'today' as unknown as Date })).toThrow(
      'Created at must be a valid Date instance',
    );
  });

  it('rejects a resolved date before creation', () => {
    expect(() => makeComment({ resolvedAt: new Date('2026-10-20T09:59:59.000Z') })).toThrow(
      'Resolved at cannot be before created at',
    );
  });

  it('resolves an open comment without mutating the original', () => {
    const comment = makeComment();
    const resolvedAt = new Date('2026-10-20T11:00:00.000Z');

    const resolved = comment.resolve(resolvedAt);

    expect(resolved).not.toBe(comment);
    expect(comment.isResolved()).toBe(false);
    expect(resolved.isResolved()).toBe(true);
    expect(resolved.resolvedAt).toEqual(resolvedAt);
    expect(resolved.body).toBe(comment.body);
    expect(resolved.createdAt).toEqual(comment.createdAt);
  });

  it('rejects resolving twice or before creation', () => {
    const resolved = makeComment().resolve(new Date('2026-10-20T11:00:00.000Z'));

    expect(() => resolved.resolve(new Date('2026-10-20T12:00:00.000Z'))).toThrow(
      'Cannot resolve an already resolved comment',
    );
    expect(() => makeComment().resolve(new Date('2026-10-20T09:00:00.000Z'))).toThrow(
      'Resolved at cannot be before created at',
    );
    expect(() => makeComment().resolve(new Date('invalid'))).toThrow(
      'Resolved at must be a valid Date instance',
    );
  });
});
