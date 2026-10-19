import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UpdateWorkspace } from '../../../../../../application/commands';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { EditWorkspaceDialog } from '../../../../../../presentation/features/workspaces/components/edit-workspace-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-alpha'),
  name: 'Alpha',
  description: 'Current description',
  createdBy: UserId.create('user-1'),
});

interface RenderOptions {
  readonly open?: boolean;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly onOpenChange?: jest.Mock;
  readonly onUpdated?: jest.Mock;
}

function renderDialog({
  open = true,
  updateWorkspace = jest.fn().mockResolvedValue({ status: 'ok', workspace: WORKSPACE }),
  onOpenChange = jest.fn(),
  onUpdated = jest.fn(),
}: RenderOptions = {}) {
  render(
    <EditWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      workspace={WORKSPACE}
      updateWorkspace={updateWorkspace}
      onUpdated={onUpdated}
    />,
  );

  return { updateWorkspace, onOpenChange, onUpdated };
}

describe('EditWorkspaceDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prefills the current name and description and cancel leaves them untouched', async () => {
    const user = userEvent.setup();
    const { updateWorkspace, onOpenChange, onUpdated } = renderDialog();

    expect(screen.getByLabelText('Name')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Description')).toHaveValue('Current description');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('saves the name and description and notifies the caller', async () => {
    const user = userEvent.setup();
    const updated = Workspace.create({
      id: WORKSPACE.id,
      name: 'Renamed',
      description: 'Updated description',
      createdBy: UserId.create('user-1'),
    });
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: updated });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Renamed');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated description');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(updateWorkspace).toHaveBeenCalledWith({
      id: 'ws-alpha',
      name: 'Renamed',
      description: 'Updated description',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears the description when the field is emptied', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest
      .fn()
      .mockResolvedValue({ status: 'ok', workspace: WORKSPACE });
    renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Description'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(updateWorkspace).toHaveBeenCalledWith({
        id: 'ws-alpha',
        name: 'Alpha',
        description: null,
      }),
    );
  });

  it('shows field errors without closing the dialog', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest.fn().mockResolvedValue({
      status: 'invalid-input',
      fieldErrors: { name: 'Enter a workspace name.' },
    });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.clear(screen.getByLabelText('Name'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a workspace name.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('shows a friendly error and stays open when the update fails', async () => {
    const user = userEvent.setup();
    const updateWorkspace: UpdateWorkspace = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'boom'),
    });
    const { onOpenChange, onUpdated } = renderDialog({ updateWorkspace });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The service is temporarily unavailable. Please try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
