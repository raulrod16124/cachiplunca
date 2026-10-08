import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createCreateWorkspace,
  type CreateWorkspace,
  type CreateWorkspaceResult,
} from '../../../../../../application/commands';
import { CreateWorkspaceDialog } from '../../../../../../presentation/features/workspaces/components/create-workspace-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { FakeWorkspaceRepository } from '../../../../../fixtures/fake-workspace-repository';

interface HarnessProps {
  readonly createWorkspace: CreateWorkspace;
  readonly open: boolean;
  readonly onOpenChange: jest.Mock;
  readonly onCreated: jest.Mock;
}

function renderDialog(createWorkspace: CreateWorkspace) {
  const onOpenChange = jest.fn();
  const onCreated = jest.fn();
  const props: HarnessProps = { createWorkspace, open: true, onOpenChange, onCreated };

  const { rerender } = render(<CreateWorkspaceDialog {...props} />);

  return { onOpenChange, onCreated, rerender, props };
}

function fillName(name: string): void {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
}

describe('CreateWorkspaceDialog', () => {
  it('renders labelled fields while open and nothing while closed', () => {
    const createWorkspace = jest.fn();
    const onOpenChange = jest.fn();
    const onCreated = jest.fn();

    const { rerender } = render(
      <CreateWorkspaceDialog
        open={false}
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        onCreated={onCreated}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        onCreated={onCreated}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows a field error for an empty name and keeps the dialog open', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    submit();

    expect(await screen.findByText('Enter a workspace name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it('creates the workspace with trimmed input, notifies and closes', async () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('  Roadmap Q4  ');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: '  Shared plan  ' },
    });
    submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createWorkspace).toHaveBeenCalledWith({
      name: '  Roadmap Q4  ',
      description: 'Shared plan',
    });
    const stored = await repository.list();
    expect(stored.map((workspace) => workspace.name)).toEqual(['Roadmap Q4']);
  });

  it('shows a friendly message when creation fails and stays open', async () => {
    const createWorkspace = jest.fn(async (): Promise<CreateWorkspaceResult> => ({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a message when the use case rejects unexpectedly', async () => {
    const createWorkspace = jest.fn(async (): Promise<CreateWorkspaceResult> => {
      throw new Error('boom');
    });
    const { onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('closes without creating when cancelled', () => {
    const repository = new FakeWorkspaceRepository();
    const createWorkspace = jest.fn(createCreateWorkspace(repository));
    const { onOpenChange, onCreated } = renderDialog(createWorkspace);

    fillName('Roadmap Q4');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createWorkspace).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('resets the fields when reopened', () => {
    const createWorkspace = jest.fn();
    const onOpenChange = jest.fn();
    const onCreated = jest.fn();

    const { rerender } = render(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        onCreated={onCreated}
      />,
    );
    fillName('Draft');

    rerender(
      <CreateWorkspaceDialog
        open={false}
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        onCreated={onCreated}
      />,
    );
    rerender(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        createWorkspace={createWorkspace}
        onCreated={onCreated}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });
});
