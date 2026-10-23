import type { FavoriteRepository } from '../../application/ports';
import { Favorite } from '../../domain/favorite';
import { UserId, WorkspaceId } from '../../domain/shared';

type RepositoryFactory = () => FavoriteRepository | Promise<FavoriteRepository>;

const USER = UserId.create('user-1');
const OTHER_USER = UserId.create('user-2');
const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

function makeFavorite(
  workspaceId: WorkspaceId = WORKSPACE,
  userId: UserId = USER,
  createdAt = CREATED_AT,
): Favorite {
  return Favorite.create({ userId, workspaceId, createdAt });
}

export function describeFavoriteRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: FavoriteRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts empty for a user', async () => {
      await expect(repository.listByUser(USER)).resolves.toEqual([]);
    });

    it('adds a favorite and exposes it through listByUser', async () => {
      const favorite = makeFavorite();

      const added = await repository.add(favorite);

      expect(added).toBe(favorite);
      const listed = await repository.listByUser(USER);
      expect(listed.map((entry) => entry.id.value)).toEqual([favorite.id.value]);
    });

    it('filters favorites by user', async () => {
      await repository.add(makeFavorite(WORKSPACE, USER));
      await repository.add(makeFavorite(OTHER_WORKSPACE, OTHER_USER));

      const listed = await repository.listByUser(USER);

      expect(listed.map((entry) => entry.workspaceId.value)).toEqual([WORKSPACE.value]);
    });

    it('is idempotent when adding the same user and workspace twice', async () => {
      const favorite = makeFavorite();

      await repository.add(favorite);
      await repository.add(favorite);

      expect((await repository.listByUser(USER)).length).toBe(1);
    });

    it('removes a favorite and is idempotent when it does not exist', async () => {
      await repository.add(makeFavorite());

      await repository.remove(USER, WORKSPACE);
      await repository.remove(USER, WORKSPACE);

      await expect(repository.listByUser(USER)).resolves.toEqual([]);
    });
  });
}
