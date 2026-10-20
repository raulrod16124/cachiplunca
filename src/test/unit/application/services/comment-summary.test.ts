import { countUnresolvedCommentsByElement } from '../../../../application/services';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';

const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const RESOLVED_AT = new Date('2026-10-20T11:00:00.000Z');

function makeComment(id: string, elementId: string, resolved = false): Comment {
  const comment = Comment.create({
    id: CommentId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    elementId: ElementId.create(elementId),
    authorId: UserId.create('user-1'),
    body: `Comment ${id}`,
    createdAt: CREATED_AT,
  });

  return resolved ? comment.resolve(RESOLVED_AT) : comment;
}

describe('countUnresolvedCommentsByElement', () => {
  it('counts unresolved comments per element', () => {
    const counts = countUnresolvedCommentsByElement([
      makeComment('a', 'el-1'),
      makeComment('b', 'el-1'),
      makeComment('c', 'el-2'),
    ]);

    expect(counts.get('el-1')).toBe(2);
    expect(counts.get('el-2')).toBe(1);
  });

  it('ignores resolved comments and returns no entry for elements without comments', () => {
    const counts = countUnresolvedCommentsByElement([
      makeComment('a', 'el-1', true),
      makeComment('b', 'el-2'),
    ]);

    expect(counts.has('el-1')).toBe(false);
    expect(counts.get('el-2')).toBe(1);
    expect(counts.has('el-3')).toBe(false);
  });

  it('returns an empty map for no comments', () => {
    expect(countUnresolvedCommentsByElement([]).size).toBe(0);
  });
});
