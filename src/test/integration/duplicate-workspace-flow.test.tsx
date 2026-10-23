import { fireEvent, screen, within } from '@testing-library/react';
import { createConnectorElement, createTextElement, richTextToPlain } from '../../domain/element';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import { createAppHarness } from './harness';

function textElement(
  id: string,
  workspaceId: Parameters<typeof createTextElement>[0]['workspaceId'],
  userId: UserId,
  content: string,
) {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId,
    createdBy: userId,
    position: Position.create(10, 20),
    size: Size.create(160, 40),
    content,
  });
}

describe('duplicate workspace flow', () => {
  it('duplicates a board and shows the copy in the list with remapped elements', async () => {
    const harness = createAppHarness();
    const user = await harness.register();
    const userId = UserId.create(user.uid);
    const source = await harness.createOwnerWorkspace('Roadmap Q4');
    const coveredSource = await harness.workspaceRepository.update(source.id, {
      coverImageUrl: 'https://storage.test/source-cover.png',
      coverImageStoragePath: `workspaces/${source.id.value}/images/source-cover.png`,
    });

    const first = textElement('text-1', source.id, userId, 'First');
    const second = textElement('text-2', source.id, userId, 'Second');
    const connector = createConnectorElement({
      id: ElementId.create('connector-1'),
      workspaceId: source.id,
      createdBy: userId,
      position: Position.create(0, 0),
      size: Size.create(0, 0),
      sourceElementId: first.id,
      targetElementId: second.id,
    });
    await harness.elementRepository.saveMany([first, second, connector]);

    harness.render({ initialPath: '/workspaces' });
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Roadmap Q4' }));

    const copyHeading = await screen.findByRole('heading', {
      level: 3,
      name: 'Copy of Roadmap Q4',
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
    expect(screen.getByRole('heading', { level: 3, name: 'Roadmap Q4' })).toBeInTheDocument();

    const workspaces = await harness.workspaceRepository.list();
    expect(workspaces).toHaveLength(2);
    const copy = workspaces.find((workspace) => workspace.name === 'Copy of Roadmap Q4');
    expect(copy).toBeDefined();
    if (copy === undefined) {
      return;
    }

    expect(copy.coverImageUrl).toBeNull();
    expect(copy.coverImageStoragePath).toBeNull();
    expect(coveredSource.coverImageUrl).toBe('https://storage.test/source-cover.png');

    const copiedElements = await harness.elementRepository.listByWorkspace(copy.id);
    expect(copiedElements.map((element) => element.id.value)).toEqual(['el-1', 'el-2', 'el-3']);
    expect(copiedElements.every((element) => element.workspaceId.equals(copy.id))).toBe(true);

    const copiedConnector = copiedElements.find((element) => element.type === 'connector');
    expect(copiedConnector?.type).toBe('connector');
    if (copiedConnector?.type === 'connector') {
      const copiedFirst = copiedElements.find(
        (element) => element.type === 'text' && richTextToPlain(element.content) === 'First',
      );
      const copiedSecond = copiedElements.find(
        (element) => element.type === 'text' && richTextToPlain(element.content) === 'Second',
      );
      expect(copiedConnector.sourceElementId?.value).toBe(copiedFirst?.id.value);
      expect(copiedConnector.targetElementId?.value).toBe(copiedSecond?.id.value);
      expect(copiedConnector.sourceElementId?.value).not.toBe('text-1');
      expect(copiedConnector.targetElementId?.value).not.toBe('text-2');
    }

    const sourceElements = await harness.elementRepository.listByWorkspace(source.id);
    expect(sourceElements.map((element) => element.id.value)).toEqual([
      'text-1',
      'text-2',
      'connector-1',
    ]);

    const copyCard = copyHeading.closest('article');
    expect(copyCard).not.toBeNull();
    if (copyCard !== null) {
      fireEvent.click(within(copyCard).getByRole('button', { name: 'Open' }));
    }
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
  });
});
