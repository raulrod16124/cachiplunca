import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createNoteElement, richTextToPlain, type TaskElement } from '../../domain/element';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function createNote(workspace: Workspace, createdBy: UserId, content: string) {
  return createNoteElement({
    id: ElementId.create('note-1'),
    workspaceId: workspace.id,
    createdBy,
    position: Position.create(100, 100),
    size: Size.create(200, 160),
    content,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  });
}

async function createTaskFromNote(harness: ReturnType<typeof createAppHarness>) {
  await harness.register(DEFAULT_CREDENTIALS);
  const workspace = await harness.createOwnerWorkspace('Task from note');
  const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');
  const note = createNote(workspace, createdBy, 'Buy milk and eggs');
  const user = userEvent.setup();

  await harness.elementRepository.save(note);
  harness.render({ initialPath: `/workspaces/${workspace.id.value}` });

  const canvas = await screen.findByRole('application', { name: 'Canvas' });

  fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });
  await user.click(screen.getByRole('menuitem', { name: 'Create task from note' }));

  return { workspace, note, user };
}

describe('create task from element', () => {
  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('creates and selects a task while keeping the source note intact', async () => {
    const harness = createAppHarness();
    const { workspace, note } = await createTaskFromNote(harness);

    const task = await waitFor(async () => {
      const stored = await harness.elementRepository.listByWorkspace(workspace.id);
      const created = stored.find((element): element is TaskElement => element.type === 'task');

      expect(created).toBeDefined();
      return created as TaskElement;
    });

    expect(richTextToPlain(task.title)).toBe('Buy milk and eggs');
    expect(task.status).toBe('todo');
    expect(task.position.x).toBe(note.position.x + note.size.width + 24);
    expect(await harness.elementRepository.findById(note.id)).toEqual(note);

    await waitFor(() =>
      expect(screen.getByTestId(`canvas-item-${task.id.value}`)).toHaveAttribute(
        'data-selected',
        'true',
      ),
    );
  });

  it('undoes and redoes the task creation', async () => {
    const harness = createAppHarness();
    const { workspace, user } = await createTaskFromNote(harness);

    await waitFor(async () =>
      expect((await harness.elementRepository.listByWorkspace(workspace.id)).length).toBe(2),
    );

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(async () =>
      expect((await harness.elementRepository.listByWorkspace(workspace.id)).length).toBe(1),
    );

    await user.click(screen.getByRole('button', { name: 'Redo' }));

    await waitFor(async () =>
      expect((await harness.elementRepository.listByWorkspace(workspace.id)).length).toBe(2),
    );
  });
});
