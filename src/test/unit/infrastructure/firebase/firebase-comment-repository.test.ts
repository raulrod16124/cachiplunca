import type { Firestore } from 'firebase/firestore';
import { Comment } from '../../../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseCommentRepository } from '../../../../infrastructure/firebase/firebase-comment-repository';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeCommentRepositoryContract } from '../../../contract/comment-repository-contract';
import type { InMemoryFirestoreApi } from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');

const WORKSPACE = WorkspaceId.create('ws-1');
const ELEMENT = ElementId.create('el-1');
const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');
const RESOLVED_AT = new Date('2026-10-20T11:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function makeComment(
  id = 'comment-1',
  overrides: Partial<Parameters<typeof Comment.create>[0]> = {},
): Comment {
  return Comment.create({
    id: CommentId.create(id),
    workspaceId: WORKSPACE,
    elementId: ELEMENT,
    authorId: UserId.create('user-1'),
    body: 'Looks good to me',
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe('createFirebaseCommentRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeCommentRepositoryContract('comment repository contract', () =>
    createFirebaseCommentRepository(makeFirestore()),
  );

  it('persists comments under the workspace subcollection', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    const comment = makeComment();

    const saved = await repository.save(comment);

    expect(saved).toBe(comment);
    expect(firestoreMock.__paths()).toEqual(['workspaces/ws-1/comments/comment-1']);
    expect(firestoreMock.__read('workspaces/ws-1/comments/comment-1')).toMatchObject({
      id: 'comment-1',
      workspaceId: 'ws-1',
      elementId: 'el-1',
      authorId: 'user-1',
      body: 'Looks good to me',
      createdAt: CREATED_AT,
    });
  });

  it('lists every comment of the workspace subcollection', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    await repository.save(makeComment('first'));
    await repository.save(makeComment('other-element', { elementId: ElementId.create('el-2') }));
    await repository.save(
      makeComment('other-workspace', { workspaceId: WorkspaceId.create('ws-2') }),
    );

    const listed = await repository.listByWorkspace(WORKSPACE);

    expect(listed.map((comment) => comment.id.value).sort()).toEqual(['first', 'other-element']);
  });

  it('lists only comments for the requested element and workspace', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    await repository.save(makeComment('first'));
    await repository.save(makeComment('second'));
    await repository.save(makeComment('other-element', { elementId: ElementId.create('el-2') }));
    await repository.save(
      makeComment('other-workspace', { workspaceId: WorkspaceId.create('ws-2') }),
    );

    const listed = await repository.listByElement(WORKSPACE, ELEMENT);

    expect(listed.map((comment) => comment.id.value).sort()).toEqual(['first', 'second']);
  });

  it('finds a comment by workspace and id, returning null when missing', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    await repository.save(makeComment());

    expect((await repository.findById(WORKSPACE, CommentId.create('comment-1')))?.body).toBe(
      'Looks good to me',
    );
    expect(await repository.findById(WORKSPACE, CommentId.create('missing'))).toBeNull();
    expect(
      await repository.findById(WorkspaceId.create('ws-2'), CommentId.create('comment-1')),
    ).toBeNull();
  });

  it('persists the resolved date when saving a resolved comment', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    const comment = await repository.save(makeComment());

    await repository.save(comment.resolve(RESOLVED_AT));

    const stored = firestoreMock.__read('workspaces/ws-1/comments/comment-1');
    expect(stored?.resolvedAt).toEqual(RESOLVED_AT);
    expect(stored?.body).toBe('Looks good to me');
    expect(stored?.authorId).toBe('user-1');
  });

  it('reads back Timestamp-like dates stored in Firestore', async () => {
    firestoreMock.__seed('workspaces/ws-1/comments/comment-1', {
      id: 'comment-1',
      workspaceId: 'ws-1',
      elementId: 'el-1',
      authorId: 'user-1',
      body: 'Seeded',
      createdAt: { toDate: () => CREATED_AT },
    });
    const repository = createFirebaseCommentRepository(makeFirestore());

    const comment = await repository.findById(WORKSPACE, CommentId.create('comment-1'));

    expect(comment?.createdAt).toEqual(CREATED_AT);
  });

  it('maps storage failures to AppErrors', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    const error: unknown = await repository
      .listByElement(WORKSPACE, ELEMENT)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('maps permission-denied failures to an authorization AppError', async () => {
    const repository = createFirebaseCommentRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository.save(makeComment()).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(firestoreMock.__paths()).toEqual([]);
  });
});
