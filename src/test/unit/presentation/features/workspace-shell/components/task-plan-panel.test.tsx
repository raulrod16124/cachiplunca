import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installDragEventPolyfill } from '../../../../../fixtures/drag-event';
import { render } from '../../../../../setup/render-with-theme';
import {
  createTaskElement,
  type CreateTaskElementProps,
  type TaskElement,
} from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { formatCalendarDate } from '../../../../../../presentation/i18n';
import {
  TaskPlanPanel,
  type TaskPlanPanelProps,
} from '../../../../../../presentation/features/workspace-shell/components/task-plan-panel';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

const BASE = {
  workspaceId: WORKSPACE_ID,
  createdBy: USER_ID,
  position: Position.create(0, 0),
  size: Size.create(100, 80),
};

function task(id: string, overrides: Partial<CreateTaskElementProps> = {}): TaskElement {
  return createTaskElement({
    ...BASE,
    id: ElementId.create(id),
    title: id,
    status: 'todo',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

function activePanel(): HTMLElement {
  return screen.getByRole('tabpanel');
}

function renderPanel(overrides: Partial<TaskPlanPanelProps> = {}): TaskPlanPanelProps {
  const props: TaskPlanPanelProps = {
    open: true,
    elements: [],
    currentUserId: USER_ID.value,
    assignees: [],
    canEdit: true,
    canCreateTask: true,
    onClose: jest.fn(),
    onSelectTask: jest.fn(),
    onChangeStatus: jest.fn(),
    onCreateTask: jest.fn(),
    ...overrides,
  };

  render(<TaskPlanPanel {...props} />);

  return props;
}

describe('TaskPlanPanel', () => {
  it('groups tasks by status and shows title, assignee and due date', () => {
    const dueDate = new Date('2099-02-15T12:00:00.000Z');

    renderPanel({
      elements: [
        task('Plan launch', {
          status: 'in_progress',
          assigneeId: USER_ID,
          dueDate,
        }),
        task('Write docs'),
      ],
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Task plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Todo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'In progress' })).toBeInTheDocument();
    const panel = within(activePanel());
    expect(panel.getByText('Plan launch')).toBeInTheDocument();
    expect(panel.getByText('Write docs')).toBeInTheDocument();
    expect(panel.getByText('Assigned to user-1')).toBeInTheDocument();
    expect(panel.getByText(`Due ${formatCalendarDate(dueDate, 'en')}`)).toBeInTheDocument();
    expect(panel.getByText('Unassigned')).toBeInTheDocument();
    expect(panel.getByText('No due date')).toBeInTheDocument();
  });

  it('renders the tabs as a full-width scoped rail', () => {
    renderPanel({ elements: [task('Todo task')] });

    const tablist = screen.getByRole('tablist', { name: 'Task plan view' });
    expect(tablist).toHaveClass('task-plan-view-tabs');
    expect(within(tablist).getAllByRole('tab')).toHaveLength(2);
    for (const tab of within(tablist).getAllByRole('tab')) {
      expect(tab).toHaveClass('task-plan-view-trigger');
    }
    expect(activePanel()).toHaveClass('task-plan-view-panel');
  });

  it('uses semantic status badges and accents in the list view', () => {
    renderPanel({
      elements: [
        task('Plan launch', { status: 'in_progress' }),
        task('Blocked task', { status: 'blocked' }),
      ],
    });

    const inProgressGroup = screen.getByRole('region', { name: 'In progress' });
    expect(within(inProgressGroup).getByText('1')).toHaveClass('rr-badge--warning');

    const inProgressRow = screen
      .getByRole('button', { name: 'Select task Plan launch' })
      .closest('[data-task-status]');
    const blockedRow = screen
      .getByRole('button', { name: 'Select task Blocked task' })
      .closest('[data-task-status]');

    expect(inProgressRow).toHaveAttribute('data-task-status', 'in_progress');
    expect(blockedRow).toHaveAttribute('data-task-status', 'blocked');
    expect(inProgressRow?.querySelector('[data-status-accent]')).toHaveAttribute(
      'data-status-accent',
      'in_progress',
    );
    expect(blockedRow?.querySelector('[data-status-accent]')).toHaveAttribute(
      'data-status-accent',
      'blocked',
    );

    const css = styleText();
    expect(css).toContain('var(--rr-color-text-warning)');
    expect(css).toContain('var(--rr-color-text-destructive)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('uses shared surfaces and status semantics in the board view', async () => {
    const user = userEvent.setup();

    renderPanel({
      elements: [
        task('Todo task'),
        task('Progress task', { status: 'in_progress' }),
        task('Done task', { status: 'completed' }),
        task('Blocked task', { status: 'blocked' }),
      ],
    });

    await user.click(screen.getByRole('tab', { name: 'Board' }));

    const board = screen.getByRole('group', { name: 'Task board' });
    const columns = within(board).getAllByRole('region');

    expect(columns[0]?.tagName).toBe('SECTION');
    expect(within(columns[0] as HTMLElement).getByText('1')).toHaveClass('rr-badge--neutral');
    expect(within(columns[1] as HTMLElement).getByText('1')).toHaveClass('rr-badge--warning');
    expect(within(columns[2] as HTMLElement).getByText('1')).toHaveClass('rr-badge--success');
    expect(within(columns[3] as HTMLElement).getByText('1')).toHaveClass('rr-badge--destructive');

    const card = within(columns[1] as HTMLElement)
      .getByRole('button', { name: 'Select task Progress task' })
      .closest('[data-task-status]');

    expect(card?.tagName).toBe('LI');
    expect(card).toHaveAttribute('data-task-status', 'in_progress');

    const css = styleText();
    expect(css).toContain('var(--cach-control-hover)');
    expect(css).toContain('var(--rr-radius-lg)');
  });

  it('shows member labels and marks overdue due dates', () => {
    renderPanel({
      assignees: [{ userId: USER_ID.value, label: 'Ada Lovelace' }],
      elements: [
        task('Late task', {
          assigneeId: USER_ID,
          dueDate: new Date('2020-03-15T00:00:00.000Z'),
        }),
      ],
    });

    expect(within(activePanel()).getByText('Assigned to Ada Lovelace')).toBeInTheDocument();
    const dueDate = document.querySelector('[data-task-overdue="true"]');
    expect(dueDate).not.toBeNull();
    expect(dueDate).toHaveTextContent('Overdue');
  });

  it('filters by status', async () => {
    const user = userEvent.setup();

    renderPanel({
      elements: [task('Todo task'), task('Progress task', { status: 'in_progress' })],
    });

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(screen.getByRole('option', { name: 'In progress' }));

    await waitFor(() => expect(screen.queryByText('Todo task')).not.toBeInTheDocument());
    expect(within(activePanel()).getByText('Progress task')).toBeInTheDocument();
  });

  it('filters to the current user tasks', async () => {
    const user = userEvent.setup();

    renderPanel({
      elements: [
        task('Mine', { assigneeId: USER_ID }),
        task('Theirs', { assigneeId: UserId.create('user-2') }),
        task('Unassigned'),
      ],
    });

    await user.click(screen.getByLabelText('My tasks'));

    await waitFor(() => expect(screen.queryByText('Theirs')).not.toBeInTheDocument());
    expect(within(activePanel()).getByText('Mine')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('selects a task when its title is activated', async () => {
    const user = userEvent.setup();
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element] });

    await user.click(screen.getByRole('button', { name: 'Select task Plan launch' }));

    expect(props.onSelectTask).toHaveBeenCalledWith('Plan launch');
  });

  it('changes the status through the accessible selector', async () => {
    const user = userEvent.setup();
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element] });

    await user.click(screen.getByRole('combobox', { name: 'Change status for Plan launch' }));
    await user.click(screen.getByRole('option', { name: 'Completed' }));

    expect(props.onChangeStatus).toHaveBeenCalledWith(element, 'completed', 0);
  });

  it('does not offer status changes in read-only mode', () => {
    renderPanel({ elements: [task('Plan launch')], canEdit: false });

    expect(
      screen.queryByRole('combobox', { name: 'Change status for Plan launch' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Todo').length).toBeGreaterThan(0);
  });

  it('creates a task from the empty state', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(props.onCreateTask).toHaveBeenCalledTimes(1);
  });

  it('clears filters when no task matches them', async () => {
    const user = userEvent.setup();

    renderPanel({ elements: [task('Todo task')] });

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(screen.getByRole('option', { name: 'In progress' }));

    expect(screen.getByText('No tasks match your filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await within(activePanel()).findByText('Todo task')).toBeInTheDocument();
  });

  it('switches to the board view with one column per status and counters', async () => {
    const user = userEvent.setup();

    renderPanel({
      elements: [task('Todo task'), task('Progress task', { status: 'in_progress' })],
    });

    await user.click(screen.getByRole('tab', { name: 'Board' }));

    const board = screen.getByRole('group', { name: 'Task board' });
    const columns = within(board).getAllByRole('region');

    expect(columns.map((column) => column.getAttribute('aria-labelledby'))).toEqual([
      'task-plan-board-group-todo',
      'task-plan-board-group-in_progress',
      'task-plan-board-group-completed',
      'task-plan-board-group-blocked',
    ]);
    expect(within(columns[0] as HTMLElement).getByText('Todo task')).toBeInTheDocument();
    expect(within(columns[1] as HTMLElement).getByText('Progress task')).toBeInTheDocument();
    expect(within(columns[0] as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(columns[2] as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(within(columns[2] as HTMLElement).getByText('No tasks')).toBeInTheDocument();
  });

  it('returns to the list view from the board', async () => {
    const user = userEvent.setup();

    renderPanel({ elements: [task('Todo task')] });

    await user.click(screen.getByRole('tab', { name: 'Board' }));
    expect(screen.queryByRole('group', { name: 'Task board' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'List' }));

    expect(screen.queryByRole('group', { name: 'Task board' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Todo' })).toBeInTheDocument();
  });

  it('selects a task from a board card', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ elements: [task('Plan launch')] });

    await user.click(screen.getByRole('tab', { name: 'Board' }));
    await user.click(screen.getByRole('button', { name: 'Select task Plan launch' }));

    expect(props.onSelectTask).toHaveBeenCalledWith('Plan launch');
  });

  it('changes the status from a board card', async () => {
    const user = userEvent.setup();
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element] });

    await user.click(screen.getByRole('tab', { name: 'Board' }));
    await user.click(screen.getByRole('button', { name: 'Change status for Plan launch' }));
    await user.click(screen.getByRole('menuitem', { name: 'Completed' }));

    expect(props.onChangeStatus).toHaveBeenCalledWith(element, 'completed', 0);
  });

  it('appends a task after the last one when its status changes', async () => {
    const user = userEvent.setup();
    const moving = task('moving');
    const first = task('first', { status: 'completed', boardOrder: 10 });
    const second = task('second', { status: 'completed', boardOrder: 20 });
    const props = renderPanel({ elements: [first, second, moving] });

    await user.click(screen.getByRole('tab', { name: 'Board' }));
    await user.click(screen.getByRole('button', { name: 'Change status for moving' }));
    await user.click(screen.getByRole('menuitem', { name: 'Completed' }));

    expect(props.onChangeStatus).toHaveBeenCalledWith(moving, 'completed', 21);
  });

  it('does not offer status changes on the board in read-only mode', async () => {
    const user = userEvent.setup();

    renderPanel({ elements: [task('Plan launch')], canEdit: false });

    await user.click(screen.getByRole('tab', { name: 'Board' }));

    expect(
      screen.queryByRole('button', { name: 'Change status for Plan launch' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Todo' })).toBeInTheDocument();
  });

  it('shows the global empty state instead of the board when there are no tasks', async () => {
    const user = userEvent.setup();

    renderPanel();

    await user.click(screen.getByRole('tab', { name: 'Board' }));

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Task board' })).not.toBeInTheDocument();
  });

  it('closes from the shared panel header', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Close task plan' }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', () => {
    renderPanel({ open: false });

    expect(screen.queryByTestId('task-plan-panel')).not.toBeInTheDocument();
  });
});

describe('TaskPlanPanel board drag and drop', () => {
  beforeAll(() => {
    installDragEventPolyfill();
  });

  function createDataTransfer(): DataTransfer {
    const store = new Map<string, string>();

    return {
      dropEffect: 'none',
      effectAllowed: 'all',
      types: [],
      setData: (type: string, value: string) => {
        store.set(type, value);
      },
      getData: (type: string) => store.get(type) ?? '',
      clearData: () => store.clear(),
      setDragImage: jest.fn(),
    } as unknown as DataTransfer;
  }

  async function openBoard(): Promise<HTMLElement> {
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Board' }));

    return screen.getByRole('group', { name: 'Task board' });
  }

  function boardCard(element: TaskElement, label = element.id.value): HTMLElement {
    const card = screen
      .getByRole('button', { name: `Select task ${label}` })
      .closest('[data-task-status]');

    if (card === null) {
      throw new Error('Expected a board card');
    }

    return card as HTMLElement;
  }

  it('moves a task to another column when dropped', async () => {
    const element = task('task-1', { title: 'Plan launch' });
    const props = renderPanel({ elements: [element] });
    const board = await openBoard();
    const transfer = createDataTransfer();

    fireEvent.dragStart(boardCard(element, 'Plan launch'), { dataTransfer: transfer });
    expect(transfer.getData('text/plain')).toBe('task-1');

    const completed = within(board).getByRole('region', { name: 'Completed' });
    fireEvent.dragOver(completed, { dataTransfer: transfer });
    expect(props.onChangeStatus).not.toHaveBeenCalled();

    fireEvent.drop(completed, { dataTransfer: transfer });
    expect(props.onChangeStatus).toHaveBeenCalledWith(element, 'completed', 0);
  });

  it('inserts a task at the top when dropped on a column header', async () => {
    const dragged = task('dragged');
    const first = task('first', { status: 'completed', boardOrder: 10 });
    const second = task('second', { status: 'completed', boardOrder: 20 });
    const props = renderPanel({ elements: [dragged, first, second] });
    const board = await openBoard();
    const transfer = createDataTransfer();
    const completed = within(board).getByRole('region', { name: 'Completed' });
    const header = within(completed).getByRole('heading', { name: 'Completed' })
      .parentElement as HTMLElement;

    fireEvent.dragStart(boardCard(dragged), { dataTransfer: transfer });
    fireEvent.dragOver(header, { dataTransfer: transfer });
    expect(header).toHaveAttribute('data-drop-start', 'true');

    fireEvent.drop(header, { dataTransfer: transfer });
    expect(props.onChangeStatus).toHaveBeenCalledWith(dragged, 'completed', 9);
  });

  it('inserts a task before the card it is dropped on', async () => {
    const dragged = task('dragged');
    const first = task('first', { status: 'completed', boardOrder: 10 });
    const second = task('second', { status: 'completed', boardOrder: 20 });
    const props = renderPanel({ elements: [dragged, first, second] });
    await openBoard();
    const transfer = createDataTransfer();
    const secondCard = boardCard(second);

    fireEvent.dragStart(boardCard(dragged), { dataTransfer: transfer });
    fireEvent.dragOver(secondCard, { dataTransfer: transfer });
    expect(secondCard).toHaveAttribute('data-drop-before', 'true');

    fireEvent.drop(secondCard, { dataTransfer: transfer });
    expect(props.onChangeStatus).toHaveBeenCalledWith(dragged, 'completed', 15);
  });

  it('appends a task when dropped on the column body', async () => {
    const dragged = task('dragged');
    const first = task('first', { status: 'completed', boardOrder: 10 });
    const second = task('second', { status: 'completed', boardOrder: 20 });
    const props = renderPanel({ elements: [dragged, first, second] });
    const board = await openBoard();
    const transfer = createDataTransfer();
    const completed = within(board).getByRole('region', { name: 'Completed' });

    fireEvent.dragStart(boardCard(dragged), { dataTransfer: transfer });
    fireEvent.drop(completed, { dataTransfer: transfer });

    expect(props.onChangeStatus).toHaveBeenCalledWith(dragged, 'completed', 21);
  });

  it('reorders a task within the same column', async () => {
    const first = task('first', { boardOrder: 10 });
    const last = task('last', { boardOrder: 30 });
    const props = renderPanel({ elements: [first, last] });
    const board = await openBoard();
    const transfer = createDataTransfer();
    const todo = within(board).getByRole('region', { name: 'Todo' });
    const header = within(todo).getByRole('heading', { name: 'Todo' }).parentElement as HTMLElement;

    fireEvent.dragStart(boardCard(last), { dataTransfer: transfer });
    fireEvent.drop(header, { dataTransfer: transfer });

    expect(props.onChangeStatus).toHaveBeenCalledWith(last, 'todo', 9);
    expect(await screen.findByText('Moved last within Todo.')).toBeInTheDocument();
  });

  it('does not change status when dropped on the current column', async () => {
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element] });
    const board = await openBoard();
    const transfer = createDataTransfer();

    fireEvent.dragStart(boardCard(element), { dataTransfer: transfer });
    fireEvent.drop(within(board).getByRole('region', { name: 'Todo' }), { dataTransfer: transfer });

    expect(props.onChangeStatus).not.toHaveBeenCalled();
  });

  it('ignores drops with an unknown task id', async () => {
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element] });
    const board = await openBoard();
    const transfer = createDataTransfer();
    transfer.setData('text/plain', 'missing-task');

    fireEvent.drop(within(board).getByRole('region', { name: 'Completed' }), {
      dataTransfer: transfer,
    });

    expect(props.onChangeStatus).not.toHaveBeenCalled();
  });

  it('announces the movement with a live region', async () => {
    const element = task('Plan launch');
    renderPanel({ elements: [element] });
    const board = await openBoard();
    const transfer = createDataTransfer();

    fireEvent.dragStart(boardCard(element), { dataTransfer: transfer });
    fireEvent.drop(within(board).getByRole('region', { name: 'Completed' }), {
      dataTransfer: transfer,
    });

    expect(await screen.findByText('Moved Plan launch to Completed.')).toBeInTheDocument();
  });

  it('marks the dragging card and the active drop target', async () => {
    const element = task('Plan launch');
    renderPanel({ elements: [element] });
    const board = await openBoard();
    const transfer = createDataTransfer();
    const card = boardCard(element);

    fireEvent.dragStart(card, { dataTransfer: transfer });
    expect(card).toHaveAttribute('data-dragging', 'true');

    const completed = within(board).getByRole('region', { name: 'Completed' });
    fireEvent.dragOver(completed, { dataTransfer: transfer });
    expect(completed).toHaveAttribute('data-drop-target', 'true');

    fireEvent.dragEnd(card, { dataTransfer: transfer });
    expect(card).not.toHaveAttribute('data-dragging');
  });

  it('describes the drag and drop affordance on editable cards', async () => {
    const element = task('Plan launch');
    renderPanel({ elements: [element] });
    await openBoard();

    const select = screen.getByRole('button', { name: 'Select task Plan launch' });
    const describedBy = select.getAttribute('aria-describedby');

    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'Drag this card to another column, or use the status menu.',
    );
    expect(boardCard(element)).toHaveAttribute('draggable', 'true');
  });

  it('does not allow dragging in read-only mode', async () => {
    const element = task('Plan launch');
    const props = renderPanel({ elements: [element], canEdit: false });
    const board = await openBoard();
    const transfer = createDataTransfer();
    const card = boardCard(element);

    expect(card).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('button', { name: 'Select task Plan launch' })).not.toHaveAttribute(
      'aria-describedby',
    );

    fireEvent.dragStart(card, { dataTransfer: transfer });
    fireEvent.drop(within(board).getByRole('region', { name: 'Completed' }), {
      dataTransfer: transfer,
    });

    expect(props.onChangeStatus).not.toHaveBeenCalled();
  });
});
