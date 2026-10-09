import type { WorkspaceRepository } from '../../application/ports';
import { WorkspaceId } from '../../domain/shared';
import { Workspace } from '../../domain/workspace';
import { ERROR_CODES, isAppError } from '../../shared/errors';

type RepositoryFactory = () => WorkspaceRepository | Promise<WorkspaceRepository>;

function requireWorkspace(workspace: Workspace | null): Workspace {
  if (workspace === null) {
    throw new Error('Expected the repository to return a workspace, got null');
  }
  return workspace;
}

function expectSameWorkspace(actual: Workspace, expected: Workspace): void {
  expect(actual).toBeInstanceOf(Workspace);
  expect(actual.id.equals(expected.id)).toBe(true);
  expect(actual.name).toBe(expected.name);
  expect(actual.description).toBe(expected.description);
  expect(actual.createdAt.getTime()).toBe(expected.createdAt.getTime());
  expect(actual.updatedAt.getTime()).toBe(expected.updatedAt.getTime());
}

export function describeWorkspaceRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: WorkspaceRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts with an empty list', async () => {
      await expect(repository.list()).resolves.toEqual([]);
    });

    it('creates a workspace with a generated id and timestamps as a domain entity', async () => {
      const workspace = await repository.create({ name: 'Product roadmap' });

      expect(workspace).toBeInstanceOf(Workspace);
      expect(workspace.id.value).not.toBe('');
      expect(workspace.name).toBe('Product roadmap');
      expect(workspace.description).toBeNull();
      expect(workspace.createdAt).toBeInstanceOf(Date);
      expect(workspace.updatedAt.getTime()).toBeGreaterThanOrEqual(workspace.createdAt.getTime());
    });

    it('exposes created workspaces through list and findById', async () => {
      const created = await repository.create({ name: 'First', description: 'notes' });

      const listed = await repository.list();
      expect(listed).toHaveLength(1);
      expectSameWorkspace(listed[0], created);

      const found = await repository.findById(created.id);
      expectSameWorkspace(requireWorkspace(found), created);
    });

    it('generates a distinct id for each workspace', async () => {
      const first = await repository.create({ name: 'One' });
      const second = await repository.create({ name: 'Two' });

      expect(first.id.value).not.toBe('');
      expect(second.id.value).not.toBe('');
      expect(first.id.equals(second.id)).toBe(false);
    });

    it('rejects create with a validation AppError when the name is empty', async () => {
      await expect(repository.create({ name: '   ' })).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
      await expect(repository.list()).resolves.toEqual([]);
    });

    it('rejects create with a validation AppError when the name exceeds 100 characters', async () => {
      await expect(repository.create({ name: 'x'.repeat(101) })).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    });

    it('returns null from findById for an unknown id', async () => {
      expect(await repository.findById(WorkspaceId.create('missing'))).toBeNull();
    });

    it('updates name and description with a new instance while preserving id and createdAt', async () => {
      const created = await repository.create({ name: 'Old name' });

      const updated = await repository.update(created.id, {
        name: 'New name',
        description: null,
      });

      expect(updated).not.toBe(created);
      expect(updated.id.equals(created.id)).toBe(true);
      expect(updated.name).toBe('New name');
      expect(updated.description).toBeNull();
      expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

      const found = await repository.findById(created.id);
      expectSameWorkspace(requireWorkspace(found), updated);

      const listed = await repository.list();
      expect(listed).toHaveLength(1);
      expectSameWorkspace(listed[0], updated);
    });

    it('keeps omitted fields untouched on update', async () => {
      const created = await repository.create({ name: 'Keeper', description: 'keep me' });

      const updated = await repository.update(created.id, { name: 'Renamed' });

      expect(updated.name).toBe('Renamed');
      expect(updated.description).toBe('keep me');
    });

    it('rejects update with a notFound AppError for an unknown id', async () => {
      await expect(
        repository.update(WorkspaceId.create('missing'), { name: 'Nope' }),
      ).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects update with a validation AppError and keeps the stored workspace intact', async () => {
      const created = await repository.create({ name: 'Original' });

      await expect(repository.update(created.id, { name: '  ' })).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });

      const stored = await repository.findById(created.id);
      expectSameWorkspace(requireWorkspace(stored), created);
      expect(stored?.name).toBe('Original');
    });

    it('deletes a workspace and stops exposing it', async () => {
      const created = await repository.create({ name: 'Disposable' });

      await expect(repository.delete(created.id)).resolves.toBeUndefined();

      await expect(repository.list()).resolves.toEqual([]);
      expect(await repository.findById(created.id)).toBeNull();
    });

    it('rejects delete with a notFound AppError for an unknown id', async () => {
      await expect(repository.delete(WorkspaceId.create('missing'))).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects every failing operation with an AppError instead of a raw error', async () => {
      const unknownId = WorkspaceId.create('missing');

      const operations = [
        repository.create({ name: '' }),
        repository.update(unknownId, { name: 'Nope' }),
        repository.delete(unknownId),
      ];

      for (const operation of operations) {
        const error: unknown = await operation.catch((reason: unknown) => reason);
        expect(isAppError(error)).toBe(true);
      }
    });
  });
}
