import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../../setup/render-with-theme';
import {
  createTaskElement,
  type CreateTaskElementProps,
  type TaskElement,
} from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { formatShortDate } from '../../../../../../presentation/i18n';
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

function renderPanel(overrides: Partial<TaskPlanPanelProps> = {}): TaskPlanPanelProps {
  const props: TaskPlanPanelProps = {
    open: true,
    elements: [],
    currentUserId: USER_ID.value,
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
    const dueDate = new Date('2024-02-15T12:00:00.000Z');

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
    expect(screen.getByText('Plan launch')).toBeInTheDocument();
    expect(screen.getByText('Write docs')).toBeInTheDocument();
    expect(screen.getByText('Assigned to user-1')).toBeInTheDocument();
    expect(screen.getByText(`Due ${formatShortDate(dueDate, 'en')}`)).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();

    renderPanel({
      elements: [task('Todo task'), task('Progress task', { status: 'in_progress' })],
    });

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(screen.getByRole('option', { name: 'In progress' }));

    await waitFor(() => expect(screen.queryByText('Todo task')).not.toBeInTheDocument());
    expect(screen.getByText('Progress task')).toBeInTheDocument();
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
    expect(screen.getByText('Mine')).toBeInTheDocument();
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

    expect(props.onChangeStatus).toHaveBeenCalledWith(element, 'completed');
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

    expect(await screen.findByText('Todo task')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    renderPanel({ open: false });

    expect(screen.queryByTestId('task-plan-panel')).not.toBeInTheDocument();
  });
});
