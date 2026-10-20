import type { CommentRepository } from '../../application/ports';
import { Comment } from '../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../domain/shared';

type RepositoryFactory = () => CommentRepository | Promise<CommentRepository>;

const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');
const ELEMENT = ElementId.create('el-1');
const OTHER_ELEMENT = ElementId.create('el-2');
const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const RESOLVED_AT = new Date('2026-10-20T11:00:00.000Z');

function makeComment(
  id: string,
  overrides: Partial<Parameters<typeof Comment.create>[0]> = {},
): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WORKSPACE,
    elementId: ELEMENT,
    authorId: UserId.create('user-1'),
    body: `Comment ${id}`,
    createdAt: CREATED_AT,
    ...overrides,
  });
}

export function describeCommentRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: CommentRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts with no comments for an element', async () => {
      await expect(repository.listByElement(WORKSPACE, ELEMENT)).resolves.toEqual([]);
      expect(await repository.findById(WORKSPACE, CommentId.create('missing'))).toBeNull();
    });

    it('stores a comment and exposes it through findById and listByElement', async () => {
      const comment = makeComment('comment-1');

      const saved = await repository.save(comment);

      expect(saved).toBe(comment);
      const found = await repository.findById(WORKSPACE, comment.id);
      expect(found?.id.equals(comment.id)).toBe(true);
      const listed = await repository.listByElement(WORKSPACE, ELEMENT);
      expect(listed.map((entry) => entry.id.value)).toEqual(['comment-1']);
    });

    it('filters comments by workspace and element', async () => {
      await repository.save(makeComment('mine'));
      await repository.save(makeComment('other-element', { elementId: OTHER_ELEMENT }));
      await repository.save(makeComment('other-workspace', { workspaceId: OTHER_WORKSPACE }));

      const listed = await repository.listByElement(WORKSPACE, ELEMENT);

      expect(listed.map((entry) => entry.id.value)).toEqual(['mine']);
    });

    it('persists a resolved comment without losing its history', async () => {
      const comment = await repository.save(makeComment('comment-1'));

      await repository.save(comment.resolve(RESOLVED_AT));

      const found = await repository.findById(WORKSPACE, CommentId.create('comment-1'));
      expect(found?.body).toBe(comment.body);
      expect(found?.createdAt).toEqual(comment.createdAt);
      expect(found?.resolvedAt).toEqual(RESOLVED_AT);
      expect(found?.isResolved()).toBe(true);
    });
  });
}
