import {
  createListWorkspaces,
  sortWorkspacesForList,
  type ListWorkspacesResult,
} from '../../../../application/queries';
import { WorkspaceId } from '../../../../domain/shared';
import { Workspace } from '../../../../domain/workspace';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

function buildWorkspace(
  id: string,
  timestamps: { createdAt: Date; updatedAt?: Date } = { createdAt: new Date('2026-01-01') },
): Workspace {
  return Workspace.create({
    id: WorkspaceId.create(id),
    name: `Workspace ${id}`,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt ?? timestamps.createdAt,
  });
}

describe('sortWorkspacesForList', () => {
  it('orders workspaces by most recently updated first', () => {
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', { createdAt: new Date('2026-02-01') });
    const newest = buildWorkspace('ws-c', {
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-04-01'),
    });

    const sorted = sortWorkspacesForList([older, newest, newer]);

    expect(sorted.map((workspace) => workspace.id.value)).toEqual(['ws-c', 'ws-b', 'ws-a']);
  });

  it('breaks updatedAt ties by createdAt, most recent first', () => {
    const sameUpdate = new Date('2026-06-01');
    const earlier = buildWorkspace('ws-a', {
      createdAt: new Date('2026-01-01'),
      updatedAt: sameUpdate,
    });
    const later = buildWorkspace('ws-b', {
      createdAt: new Date('2026-02-01'),
      updatedAt: sameUpdate,
    });

    const sorted = sortWorkspacesForList([earlier, later]);

    expect(sorted.map((workspace) => workspace.id.value)).toEqual(['ws-b', 'ws-a']);
  });

  it('breaks full ties by id so the order is deterministic', () => {
    const timestamps = { createdAt: new Date('2026-01-01') };
    const first = buildWorkspace('ws-a', timestamps);
    const second = buildWorkspace('ws-b', timestamps);

    const ascending = sortWorkspacesForList([second, first]);
    const descending = sortWorkspacesForList([first, second]);

    expect(ascending.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
    expect(descending.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
  });

  it('does not mutate the input array', () => {
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', { createdAt: new Date('2026-02-01') });
    const input = [older, newer];

    const sorted = sortWorkspacesForList(input);

    expect(input.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
    expect(sorted).not.toBe(input);
  });
});

describe('createListWorkspaces', () => {
  it('returns an ok result with an empty list when the repository is empty', async () => {
    const repository = new FakeWorkspaceRepository();
    const listWorkspaces = createListWorkspaces(repository);

    const result = await listWorkspaces();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces).toEqual([]);
    }
  });

  it('returns every workspace from the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    await repository.create({ name: 'First' });
    await repository.create({ name: 'Second' });
    const listWorkspaces = createListWorkspaces(repository);

    const result = await listWorkspaces();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces.map((workspace) => workspace.name).sort()).toEqual([
        'First',
        'Second',
      ]);
    }
  });

  it('orders the result by most recently updated first', async () => {
    const repository = new FakeWorkspaceRepository();
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', {
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-03-01'),
    });
    jest.spyOn(repository, 'list').mockResolvedValue([older, newer]);
    const listWorkspaces = createListWorkspaces(repository);

    const result = await listWorkspaces();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces.map((workspace) => workspace.id.value)).toEqual(['ws-b', 'ws-a']);
    }
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'list').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const listWorkspaces = createListWorkspaces(repository);

    const result: ListWorkspacesResult = await listWorkspaces();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'list').mockRejectedValue(new Error('socket hang up'));
    const listWorkspaces = createListWorkspaces(repository);

    const result: ListWorkspacesResult = await listWorkspaces();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
