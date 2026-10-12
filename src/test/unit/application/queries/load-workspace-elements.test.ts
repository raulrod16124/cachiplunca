import { createLoadWorkspaceElements, sortElementsForLoad } from '../../../../application/queries';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

interface BuildTextOverrides {
  readonly id: string;
  readonly workspaceId?: WorkspaceId;
  readonly createdAt?: Date;
}

function buildTextElement(overrides: BuildTextOverrides): Element {
  return createTextElement({
    id: ElementId.create(overrides.id),
    workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    content: `content-${overrides.id}`,
    ...(overrides.createdAt === undefined ? {} : { createdAt: overrides.createdAt }),
  });
}

describe('createLoadWorkspaceElements', () => {
  it('returns an empty list when the workspace has no elements', async () => {
    const repository = new FakeElementRepository();
    const loadWorkspaceElements = createLoadWorkspaceElements(repository);

    const result = await loadWorkspaceElements(WORKSPACE_ID.value);

    expect(result).toEqual({ status: 'ok', elements: [] });
  });

  it('returns the elements stored for the workspace', async () => {
    const repository = new FakeElementRepository();
    const element = buildTextElement({ id: 'el-1' });
    await repository.save(element);

    const loadWorkspaceElements = createLoadWorkspaceElements(repository);
    const result = await loadWorkspaceElements(WORKSPACE_ID.value);

    expect(result).toEqual({ status: 'ok', elements: [element] });
  });

  it('only returns the elements of the requested workspace', async () => {
    const otherWorkspaceId = WorkspaceId.create('ws-2');
    const repository = new FakeElementRepository();
    const here = buildTextElement({ id: 'el-here' });
    const elsewhere = buildTextElement({ id: 'el-elsewhere', workspaceId: otherWorkspaceId });
    await repository.saveMany([here, elsewhere]);

    const loadWorkspaceElements = createLoadWorkspaceElements(repository);
    const result = await loadWorkspaceElements(WORKSPACE_ID.value);

    expect(result).toEqual({ status: 'ok', elements: [here] });
  });

  it('returns an error when the repository fails', async () => {
    const repository = new FakeElementRepository();
    jest.spyOn(repository, 'listByWorkspace').mockRejectedValueOnce(new Error('Database down'));

    const loadWorkspaceElements = createLoadWorkspaceElements(repository);
    const result = await loadWorkspaceElements(WORKSPACE_ID.value);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('Database down');
    }
  });

  it('returns an error for an invalid workspace id', async () => {
    const repository = new FakeElementRepository();
    const loadWorkspaceElements = createLoadWorkspaceElements(repository);

    const result = await loadWorkspaceElements('   ');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.message).toBe('WorkspaceId cannot be empty');
    }
  });

  it('does not touch the repository for an invalid workspace id', async () => {
    const repository = new FakeElementRepository();
    const spy = jest.spyOn(repository, 'listByWorkspace');

    const loadWorkspaceElements = createLoadWorkspaceElements(repository);
    await loadWorkspaceElements('');

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('sortElementsForLoad', () => {
  it('orders elements by createdAt and falls back to id for ties', () => {
    const later = buildTextElement({ id: 'el-b', createdAt: new Date('2024-02-01T00:00:00.000Z') });
    const sameDateB = buildTextElement({
      id: 'el-d',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const sameDateA = buildTextElement({
      id: 'el-c',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const earliest = buildTextElement({
      id: 'el-a',
      createdAt: new Date('2023-12-01T00:00:00.000Z'),
    });

    const sorted = sortElementsForLoad([later, sameDateB, sameDateA, earliest]);

    expect(sorted.map((element) => element.id.value)).toEqual(['el-a', 'el-c', 'el-d', 'el-b']);
  });

  it('does not mutate the input array', () => {
    const first = buildTextElement({ id: 'el-a' });
    const second = buildTextElement({ id: 'el-b' });
    const input = [first, second];

    const sorted = sortElementsForLoad(input);

    expect(input).toEqual([first, second]);
    expect(sorted).not.toBe(input);
  });
});
