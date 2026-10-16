import { UserId } from '../../../../domain/shared';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';
import { describeWorkspaceRepositoryContract } from '../../../contract/workspace-repository-contract';

const CREATED_BY = UserId.create('user-1');

describe('FakeWorkspaceRepository', () => {
  describeWorkspaceRepositoryContract('workspace repository contract', () => {
    return new FakeWorkspaceRepository();
  });

  it('generates sequential ws-<n> ids', async () => {
    const repository = new FakeWorkspaceRepository();

    const first = await repository.create({ createdBy: CREATED_BY, name: 'One' });
    const second = await repository.create({ createdBy: CREATED_BY, name: 'Two' });

    expect(first.id.value).toBe('ws-1');
    expect(second.id.value).toBe('ws-2');
  });

  it('returns the stored instance from list and findById', async () => {
    const repository = new FakeWorkspaceRepository();

    const created = await repository.create({ createdBy: CREATED_BY, name: 'Identity' });

    const listed = await repository.list();
    expect(listed[0]).toBe(created);
    expect(await repository.findById(created.id)).toBe(created);
  });

  it('keeps instances independent from each other', async () => {
    const first = new FakeWorkspaceRepository();
    const second = new FakeWorkspaceRepository();

    await first.create({ createdBy: CREATED_BY, name: 'Only in first' });

    await expect(second.list()).resolves.toEqual([]);
  });
});
