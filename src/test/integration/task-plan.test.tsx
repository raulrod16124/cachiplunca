import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTaskElement, type TaskElement } from '../../domain/element';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function createTask(
  workspace: Workspace,
  createdBy: UserId,
  id: string,
  title: string,
  overrides: Partial<Parameters<typeof createTaskElement>[0]> = {},
): TaskElement {
  return createTaskElement({
    id: ElementId.create(id),
    workspaceId: workspace.id,
    createdBy,
    position: Position.create(0, 0),
    size: Size.create(200, 120),
    title,
    status: 'todo',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

async function openTaskPlan(): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole('button', { name: 'Task plan' }));

  return screen.findByTestId('task-plan-panel');
}

describe('task plan', () => {
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

  it('selects a task and persists a status change from the panel', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Plan board');
    const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');
    const user = userEvent.setup();

    await harness.elementRepository.save(createTask(workspace, createdBy, 'task-1', 'Plan launch'));

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    const panel = await openTaskPlan();

    const selectTask = within(panel).getByRole('button', { name: 'Select task Plan launch' });
    expect(selectTask).toBeInTheDocument();

    await user.click(selectTask);

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-task-1')).toHaveAttribute('data-selected', 'true'),
    );

    await user.click(
      within(panel).getByRole('combobox', { name: 'Change status for Plan launch' }),
    );
    await user.click(screen.getByRole('option', { name: 'Completed' }));

    await waitFor(async () => {
      const stored = await harness.elementRepository.findById(ElementId.create('task-1'));
      expect(stored?.type).toBe('task');
      expect(stored?.type === 'task' ? stored.status : undefined).toBe('completed');
    });
  });

  it('reflects remote task changes in real time', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Live plan');
    const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');

    await harness.elementRepository.save(createTask(workspace, createdBy, 'task-1', 'Plan launch'));

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await openTaskPlan();

    expect(screen.getByRole('heading', { level: 3, name: 'Todo' })).toBeInTheDocument();

    act(() => {
      harness.realtimePort.emit({
        workspaceId: workspace.id,
        changes: [
          {
            kind: 'modified',
            element: createTask(workspace, createdBy, 'task-1', 'Plan launch', {
              status: 'in_progress',
              updatedAt: new Date('2024-01-02T00:00:00.000Z'),
            }),
            origin: 'remote',
          },
        ],
      });
    });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'In progress' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Todo' })).not.toBeInTheDocument();
  });

  it('does not allow viewers to change task status from the panel', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const currentUser = harness.currentUser;

    if (currentUser === null) {
      throw new Error('Expected an authenticated user');
    }

    const createdBy = UserId.create(currentUser.uid);
    const workspace = await harness.workspaceRepository.create({
      name: 'Read only plan',
      createdBy,
    });
    await harness.membershipRepository.create({
      userId: createdBy,
      workspaceId: workspace.id,
      role: 'viewer',
    });
    await harness.elementRepository.save(createTask(workspace, createdBy, 'task-1', 'Plan launch'));

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    const panel = await openTaskPlan();

    expect(
      within(panel).getByRole('button', { name: 'Select task Plan launch' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Change status for Plan launch' }),
    ).not.toBeInTheDocument();
  });
});
