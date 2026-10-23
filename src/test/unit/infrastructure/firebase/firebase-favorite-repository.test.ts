import type { Firestore } from 'firebase/firestore';
import { Favorite } from '../../../../domain/favorite';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseFavoriteRepository } from '../../../../infrastructure/firebase/firebase-favorite-repository';
import { describeFavoriteRepositoryContract } from '../../../contract/favorite-repository-contract';
import type { InMemoryFirestoreApi } from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');

const USER = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function makeFavorite(): Favorite {
  return Favorite.create({ userId: USER, workspaceId: WORKSPACE, createdAt: CREATED_AT });
}

describe('createFirebaseFavoriteRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeFavoriteRepositoryContract('favorite repository contract', () =>
    createFirebaseFavoriteRepository(makeFirestore()),
  );

  it('persists favorites in the top-level collection with the deterministic id', async () => {
    const repository = createFirebaseFavoriteRepository(makeFirestore());

    await repository.add(makeFavorite());

    expect(firestoreMock.__paths()).toEqual(['favorites/user-1_ws-1']);
    expect(firestoreMock.__read('favorites/user-1_ws-1')).toMatchObject({
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: CREATED_AT,
    });
  });

  it('queries favorites by user', async () => {
    firestoreMock.__seed('favorites/user-1_ws-1', {
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: CREATED_AT,
    });
    firestoreMock.__seed('favorites/user-2_ws-2', {
      id: 'user-2_ws-2',
      userId: 'user-2',
      workspaceId: 'ws-2',
      createdAt: CREATED_AT,
    });
    const repository = createFirebaseFavoriteRepository(makeFirestore());

    const favorites = await repository.listByUser(USER);

    expect(favorites.map((favorite) => favorite.id.value)).toEqual(['user-1_ws-1']);
  });

  it('reads back Timestamp-like dates stored in Firestore', async () => {
    firestoreMock.__seed('favorites/user-1_ws-1', {
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: { toDate: () => CREATED_AT },
    });
    const repository = createFirebaseFavoriteRepository(makeFirestore());

    const favorites = await repository.listByUser(USER);

    expect(favorites[0]?.createdAt).toEqual(CREATED_AT);
  });

  it('rejects malformed documents', async () => {
    firestoreMock.__seed('favorites/user-1_ws-1', {
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: 'invalid',
    });
    const repository = createFirebaseFavoriteRepository(makeFirestore());

    await expect(repository.listByUser(USER)).rejects.toMatchObject({
      code: 'validation/invalid-input',
    });
  });
});
