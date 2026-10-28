import { fireEvent, render, screen } from '@testing-library/react';
import { TaskFormDialog } from '../../../../../presentation/canvas/components/task-form-dialog';
import type {
  TaskAssigneeOption,
  TaskFormValues,
} from '../../../../../presentation/canvas/components/task-form-dialog';

function renderDialog(options: {
  readonly mode?: 'create' | 'edit';
  readonly initialValues?: TaskFormValues;
  readonly assignees?: readonly TaskAssigneeOption[];
  readonly onSubmit?: jest.Mock;
  readonly onOpenChange?: jest.Mock;
}) {
  const onSubmit = options.onSubmit ?? jest.fn();
  const onOpenChange = options.onOpenChange ?? jest.fn();

  render(
    <TaskFormDialog
      open
      mode={options.mode ?? 'create'}
      initialValues={options.initialValues}
      assignees={options.assignees}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, onOpenChange };
}

function fillTitle(title: string): void {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
}

function fillNotes(notes: string): void {
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: notes } });
}

function selectStatus(label: string): void {
  fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
}

function selectAssignee(label: string): void {
  fireEvent.click(screen.getByRole('combobox', { name: 'Assignee' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
}

function fillDueDate(value: string): void {
  fireEvent.change(screen.getByLabelText('Due date'), { target: { value } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
}

describe('TaskFormDialog', () => {
  it('uses the shared modal layout and keeps the footer outside the scroll body', () => {
    renderDialog({});

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(screen.getByTestId('modal-layout')).toContainElement(body);
    expect(body).not.toContainElement(footer);
  });

  it('renders the create-mode form with a todo default', () => {
    renderDialog({});

    const dialog = screen.getByRole('dialog');
    const description = screen.getByText('Set a title, status, assignee and due date.');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'New task' })).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-describedby', description.id);
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Todo');
    expect(screen.getByRole('combobox', { name: 'Assignee' })).toHaveTextContent('Unassigned');
    expect(screen.getByLabelText('Due date')).toHaveValue('');
    expect(screen.getByLabelText('Notes')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create task' })).toBeInTheDocument();
  });

  it('submits the title, status and notes', () => {
    const { onSubmit } = renderDialog({});

    fillTitle('  Ship the MVP  ');
    selectStatus('In progress');
    fillNotes('Wait for review');
    submit();

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Ship the MVP',
      status: 'in_progress',
      notes: 'Wait for review',
      assigneeId: '',
      dueDate: '',
    });
  });

  it('defaults to todo and submits empty notes as an empty string', () => {
    const { onSubmit } = renderDialog({});

    fillTitle('No notes task');
    submit();

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'No notes task',
      status: 'todo',
      notes: '',
      assigneeId: '',
      dueDate: '',
    });
  });

  it('submits the selected assignee and due date', () => {
    const { onSubmit } = renderDialog({
      assignees: [
        { userId: 'user-1', label: 'Ada Lovelace' },
        { userId: 'user-2', label: 'Grace Hopper' },
      ],
    });

    fillTitle('Ship the MVP');
    selectAssignee('Grace Hopper');
    fillDueDate('2026-03-15');
    submit();

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Ship the MVP',
      status: 'todo',
      notes: '',
      assigneeId: 'user-2',
      dueDate: '2026-03-15',
    });
  });

  it('keeps an assignee that is no longer in the member list visible', () => {
    renderDialog({
      mode: 'edit',
      initialValues: {
        title: 'Draft spec',
        status: 'todo',
        notes: '',
        assigneeId: 'departed-user',
        dueDate: '',
      },
      assignees: [{ userId: 'user-1', label: 'Ada Lovelace' }],
    });

    expect(screen.getByRole('combobox', { name: 'Assignee' })).toHaveTextContent('ted-user');
  });

  it('renders the status options above the dialog overlay', () => {
    renderDialog({});

    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));

    expect(screen.getByRole('listbox').style.zIndex).toBe('calc(var(--rr-z-modal) + 1)');
  });

  it('shows a validation error for an empty title and does not submit', () => {
    const { onSubmit } = renderDialog({});

    fillTitle('   ');
    submit();

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-describedby',
      screen.getByText('Title is required').id,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills the form in edit mode and uses the save label', () => {
    renderDialog({
      mode: 'edit',
      initialValues: {
        title: 'Draft spec',
        status: 'blocked',
        notes: 'Waiting on API',
        assigneeId: 'user-2',
        dueDate: '2026-03-15',
      },
    });

    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { level: 2, name: 'Edit task' })).toBeInTheDocument();
    expect(
      screen.queryByText('Update the title, status, assignee, due date or notes.'),
    ).not.toBeInTheDocument();
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Title')).toHaveValue('Draft spec');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Blocked');
    expect(screen.getByLabelText('Notes')).toHaveValue('Waiting on API');
    expect(screen.getByRole('combobox', { name: 'Assignee' })).toHaveTextContent('user-2');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-03-15');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('submits the edited values through the save button', () => {
    const { onSubmit } = renderDialog({
      mode: 'edit',
      initialValues: {
        title: 'Draft spec',
        status: 'todo',
        notes: '',
        assigneeId: '',
        dueDate: '',
      },
    });

    fillTitle('Final spec');
    selectStatus('Completed');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Final spec',
      status: 'completed',
      notes: '',
      assigneeId: '',
      dueDate: '',
    });
  });

  it('closes through the cancel button without submitting', () => {
    const { onSubmit, onOpenChange } = renderDialog({});

    fillTitle('Discarded');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
