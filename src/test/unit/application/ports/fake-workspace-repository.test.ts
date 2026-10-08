import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';
import { WorkspaceId } from '../../../../domain/shared';
import { Workspace } from '../../../../domain/workspace';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';

describe('FakeWorkspaceRepository', () => {
  it('starts with an empty list', async () => {
    const repository = new FakeWorkspaceRepository();

    await expect(repository.list()).resolves.toEqual([]);
  });

  it('creates a workspace with a generated id and timestamps as a domain entity', async () => {
    const repository = new FakeWorkspaceRepository();

    const workspace = await repository.create({ name: 'Product roadmap' });

    expect(workspace).toBeInstanceOf(Workspace);
    expect(workspace.id.value).toBe('ws-1');
    expect(workspace.name).toBe('Product roadmap');
    expect(workspace.description).toBeNull();
    expect(workspace.createdAt).toBeInstanceOf(Date);
    expect(workspace.updatedAt.getTime()).toBeGreaterThanOrEqual(workspace.createdAt.getTime());
  });

  it('exposes created workspaces through list and findById', async () => {
    const repository = new FakeWorkspaceRepository();

    const created = await repository.create({ name: 'First', description: 'notes' });

    const listed = await repository.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toBe(created);

    expect(await repository.findById(created.id)).toBe(created);
  });

  it('generates a distinct id for each workspace', async () => {
    const repository = new FakeWorkspaceRepository();

    const first = await repository.create({ name: 'One' });
    const second = await repository.create({ name: 'Two' });

    expect(first.id.value).toBe('ws-1');
    expect(second.id.value).toBe('ws-2');
    expect(first.id.equals(second.id)).toBe(false);
  });

  it('rejects create with a validation AppError when the name is empty', async () => {
    const repository = new FakeWorkspaceRepository();

    await expect(repository.create({ name: '   ' })).rejects.toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
    await expect(repository.list()).resolves.toEqual([]);
  });

  it('rejects create with a validation AppError when the name exceeds 100 characters', async () => {
    const repository = new FakeWorkspaceRepository();

    await expect(repository.create({ name: 'x'.repeat(101) })).rejects.toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
  });

  it('returns null from findById for an unknown id', async () => {
    const repository = new FakeWorkspaceRepository();

    expect(await repository.findById(WorkspaceId.create('missing'))).toBeNull();
  });

  it('updates name and description with a new instance while preserving id and createdAt', async () => {
    const repository = new FakeWorkspaceRepository();
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

    expect(await repository.findById(created.id)).toBe(updated);
    const listed = await repository.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toBe(updated);
  });

  it('keeps omitted fields untouched on update', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Keeper', description: 'keep me' });

    const updated = await repository.update(created.id, { name: 'Renamed' });

    expect(updated.name).toBe('Renamed');
    expect(updated.description).toBe('keep me');
  });

  it('rejects update with a notFound AppError for an unknown id', async () => {
    const repository = new FakeWorkspaceRepository();

    await expect(
      repository.update(WorkspaceId.create('missing'), { name: 'Nope' }),
    ).rejects.toMatchObject({
      kind: 'notFound',
      code: ERROR_CODES.NOT_FOUND_RESOURCE,
    });
  });

  it('rejects update with a validation AppError and keeps the stored workspace intact', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Original' });

    await expect(repository.update(created.id, { name: '  ' })).rejects.toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });

    const stored = await repository.findById(created.id);
    expect(stored).toBe(created);
    expect(stored?.name).toBe('Original');
  });

  it('deletes a workspace and stops exposing it', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Disposable' });

    await expect(repository.delete(created.id)).resolves.toBeUndefined();

    await expect(repository.list()).resolves.toEqual([]);
    expect(await repository.findById(created.id)).toBeNull();
  });

  it('rejects delete with a notFound AppError for an unknown id', async () => {
    const repository = new FakeWorkspaceRepository();

    await expect(repository.delete(WorkspaceId.create('missing'))).rejects.toMatchObject({
      kind: 'notFound',
      code: ERROR_CODES.NOT_FOUND_RESOURCE,
    });
  });

  it('rejects every failing operation with an AppError instead of a raw error', async () => {
    const repository = new FakeWorkspaceRepository();
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

  it('keeps instances independent from each other', async () => {
    const first = new FakeWorkspaceRepository();
    const second = new FakeWorkspaceRepository();

    await first.create({ name: 'Only in first' });

    await expect(second.list()).resolves.toEqual([]);
  });
});
