import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';
import { describeElementRepositoryContract } from '../../../contract/element-repository-contract';

function buildTextElement(id: string, workspaceId: WorkspaceId, content: string): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId,
    createdBy: UserId.create('user-1'),
    position: Position.create(0, 0),
    size: Size.create(10, 10),
    content,
  });
}

describe('FakeElementRepository', () => {
  describeElementRepositoryContract('element repository contract', () => {
    return new FakeElementRepository();
  });

  it('returns the stored element instance from list and findById', async () => {
    const repository = new FakeElementRepository();
    const workspaceId = WorkspaceId.create('ws-1');

    const saved = await repository.save(buildTextElement('el-1', workspaceId, 'Stored'));

    const listed = await repository.listByWorkspace(workspaceId);
    expect(listed[0]).toBe(saved);
    expect(await repository.findById(saved.id)).toBe(saved);
  });

  it('keeps instances independent from each other', async () => {
    const first = new FakeElementRepository();
    const second = new FakeElementRepository();
    const workspaceId = WorkspaceId.create('ws-1');

    await first.save(buildTextElement('el-1', workspaceId, 'Only in first'));

    await expect(second.listByWorkspace(workspaceId)).resolves.toEqual([]);
  });
});
