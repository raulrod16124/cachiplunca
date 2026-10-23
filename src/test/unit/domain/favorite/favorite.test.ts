import { Favorite, FavoriteId } from '../../../../domain/favorite';
import { UserId, WorkspaceId } from '../../../../domain/shared';

const USER = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

describe('Favorite', () => {
  it('creates a favorite with a deterministic id', () => {
    const favorite = Favorite.create({
      userId: USER,
      workspaceId: WORKSPACE,
      createdAt: CREATED_AT,
    });

    expect(favorite.id.value).toBe('user-1_ws-1');
    expect(favorite.userId.equals(USER)).toBe(true);
    expect(favorite.workspaceId.equals(WORKSPACE)).toBe(true);
    expect(favorite.createdAt).toEqual(CREATED_AT);
  });

  it('uses the current date by default', () => {
    const before = Date.now();
    const favorite = Favorite.create({ userId: USER, workspaceId: WORKSPACE });

    expect(favorite.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('rejects an invalid timestamp', () => {
    expect(() =>
      Favorite.create({
        userId: USER,
        workspaceId: WORKSPACE,
        createdAt: new Date('invalid'),
      }),
    ).toThrow('Favorite timestamp must be a valid Date');
  });

  it('reconstitutes a persisted favorite', () => {
    const favorite = Favorite.fromPersistence({
      id: FavoriteId.create('user-1_ws-1'),
      userId: USER,
      workspaceId: WORKSPACE,
      createdAt: CREATED_AT,
    });

    expect(favorite.id.value).toBe('user-1_ws-1');
  });

  it('rejects a persisted id that does not match user and workspace', () => {
    expect(() =>
      Favorite.fromPersistence({
        id: FavoriteId.create('user-2_ws-1'),
        userId: USER,
        workspaceId: WORKSPACE,
        createdAt: CREATED_AT,
      }),
    ).toThrow('Favorite id must match userId and workspaceId');
  });

  it('serializes to JSON', () => {
    const favorite = Favorite.create({
      userId: USER,
      workspaceId: WORKSPACE,
      createdAt: CREATED_AT,
    });

    expect(favorite.toJSON()).toEqual({
      id: 'user-1_ws-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      createdAt: '2026-10-23T10:00:00.000Z',
    });
  });

  it('compares favorites by value', () => {
    const first = Favorite.create({
      userId: USER,
      workspaceId: WORKSPACE,
      createdAt: CREATED_AT,
    });
    const second = Favorite.create({
      userId: USER,
      workspaceId: WORKSPACE,
      createdAt: CREATED_AT,
    });

    expect(first.equals(second)).toBe(true);
  });
});

describe('FavoriteId', () => {
  it('rejects an empty value', () => {
    expect(() => FavoriteId.create('   ')).toThrow('FavoriteId cannot be empty');
  });

  it('builds the deterministic id from user and workspace', () => {
    expect(FavoriteId.forUserAndWorkspace('user-1', 'ws-1').value).toBe('user-1_ws-1');
  });
});
