import { Favorite, FavoriteId } from '../../../../domain/favorite';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromFavoriteDocument,
  toFavoriteDocument,
} from '../../../../infrastructure/firebase/firebase-favorite-mapper';

const USER = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

function makeFavorite(): Favorite {
  return Favorite.create({ userId: USER, workspaceId: WORKSPACE, createdAt: CREATED_AT });
}

describe('firebase favorite mapper', () => {
  it('round-trips a favorite document', () => {
    const favorite = makeFavorite();

    const document = toFavoriteDocument(favorite);
    const restored = fromFavoriteDocument(favorite.id.value, document);

    expect(document).toEqual({
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: CREATED_AT,
    });
    expect(restored.equals(favorite)).toBe(true);
  });

  it('reads Timestamp-like dates from Firestore', () => {
    const restored = fromFavoriteDocument('user-1_ws-1', {
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: { toDate: () => CREATED_AT },
    });

    expect(restored.createdAt).toEqual(CREATED_AT);
  });

  it('rejects a document whose id does not match the document path', () => {
    expect(() =>
      fromFavoriteDocument('user-1_ws-1', {
        id: 'user-2_ws-1',
        userId: 'user-1',
        workspaceId: 'ws-1',
        createdAt: CREATED_AT,
      }),
    ).toThrow('Favorite document field "id" must match the document id');
  });

  it('rejects a persisted id that does not match user and workspace', () => {
    expect(() =>
      fromFavoriteDocument('user-1_ws-1', {
        id: 'user-1_ws-1',
        userId: 'user-2',
        workspaceId: 'ws-1',
        createdAt: CREATED_AT,
      }),
    ).toThrow('Favorite id must match userId and workspaceId');
  });

  it('rejects invalid dates', () => {
    expect(() =>
      fromFavoriteDocument('user-1_ws-1', {
        id: 'user-1_ws-1',
        userId: 'user-1',
        workspaceId: 'ws-1',
        createdAt: 'yesterday',
      }),
    ).toThrow('Favorite document field "createdAt" must be a Date or Timestamp');
  });

  it('rejects a non-object document', () => {
    expect(() => fromFavoriteDocument('user-1_ws-1', null)).toThrow(
      'Favorite document must be an object',
    );
  });

  it('exposes the deterministic id helper', () => {
    expect(FavoriteId.forUserAndWorkspace('user-1', 'ws-1').value).toBe('user-1_ws-1');
  });
});
