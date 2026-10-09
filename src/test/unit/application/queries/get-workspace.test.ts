import { createGetWorkspace } from '../../../../application/queries';
import { Workspace } from '../../../../domain/workspace';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

describe('createGetWorkspace', () => {
  it('returns the workspace when it exists', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = await repository.create({ name: 'Marketing plan' });

    const getWorkspace = createGetWorkspace(repository);
    const result = await getWorkspace(created.id.value);

    expect(result).toEqual({ status: 'ok', workspace: created });
  });

  it('returns notFound when the workspace does not exist', async () => {
    const repository = new FakeWorkspaceRepository();
    const getWorkspace = createGetWorkspace(repository);

    const result = await getWorkspace('ws-missing');

    expect(result).toEqual({ status: 'notFound' });
  });

  it('returns an error when the repository fails', async () => {
    const repository = new FakeWorkspaceRepository();
    jest.spyOn(repository, 'findById').mockRejectedValueOnce(new Error('Database unavailable'));

    const getWorkspace = createGetWorkspace(repository);
    const result = await getWorkspace('ws-any');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('Database unavailable');
    }
  });

  it('returns an error for an invalid workspace id', async () => {
    const repository = new FakeWorkspaceRepository();
    const getWorkspace = createGetWorkspace(repository);

    const result = await getWorkspace('   ');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.message).toBe('WorkspaceId cannot be empty');
    }
  });
});

describe('Workspace entity reuse in get-workspace', () => {
  it('preserves workspace invariants returned from the repository', async () => {
    const repository = new FakeWorkspaceRepository();
    const created = Workspace.create({
      id: (await repository.create({ name: 'placeholder' })).id,
      name: 'Roadmap',
      description: 'Q4 goals',
    });
    jest.spyOn(repository, 'findById').mockResolvedValue(created);

    const getWorkspace = createGetWorkspace(repository);
    const result = await getWorkspace(created.id.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.name).toBe('Roadmap');
      expect(result.workspace.description).toBe('Q4 goals');
      expect(result.workspace.id.equals(created.id)).toBe(true);
    }
  });
});
