import { fireEvent, render, screen } from '@testing-library/react';
import { TaskFormDialog } from '../../../../../presentation/canvas/components/task-form-dialog';
import type { TaskFormValues } from '../../../../../presentation/canvas/components/task-form-dialog';

function renderDialog(options: {
  readonly mode?: 'create' | 'edit';
  readonly initialValues?: TaskFormValues;
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

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
}

describe('TaskFormDialog', () => {
  it('renders the create-mode form with a todo default', () => {
    renderDialog({});

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'New task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Todo');
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
    });
  });

  it('shows a validation error for an empty title and does not submit', () => {
    const { onSubmit } = renderDialog({});

    fillTitle('   ');
    submit();

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills the form in edit mode and uses the save label', () => {
    renderDialog({
      mode: 'edit',
      initialValues: {
        title: 'Draft spec',
        status: 'blocked',
        notes: 'Waiting on API',
      },
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Draft spec');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Blocked');
    expect(screen.getByLabelText('Notes')).toHaveValue('Waiting on API');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('submits the edited values through the save button', () => {
    const { onSubmit } = renderDialog({
      mode: 'edit',
      initialValues: { title: 'Draft spec', status: 'todo', notes: '' },
    });

    fillTitle('Final spec');
    selectStatus('Completed');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Final spec',
      status: 'completed',
      notes: '',
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
