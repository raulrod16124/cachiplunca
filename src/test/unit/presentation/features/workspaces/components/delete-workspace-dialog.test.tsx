import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteWorkspace } from '../../../../../../application/commands';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { DeleteWorkspaceDialog } from '../../../../../../presentation/features/workspaces/components/delete-workspace-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-alpha'),
  name: 'Alpha',
  createdBy: UserId.create('user-1'),
});

interface RenderOptions {
  readonly open?: boolean;
  readonly deleteWorkspace?: DeleteWorkspace;
  readonly onOpenChange?: jest.Mock;
  readonly onDeleted?: jest.Mock;
}

function renderDialog({
  open = true,
  deleteWorkspace = jest.fn().mockResolvedValue({ status: 'ok' }),
  onOpenChange = jest.fn(),
  onDeleted = jest.fn(),
}: RenderOptions = {}) {
  render(
    <DeleteWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      workspace={WORKSPACE}
      deleteWorkspace={deleteWorkspace}
      actorUserId="user-1"
      onDeleted={onDeleted}
    />,
  );

  return { deleteWorkspace, onOpenChange, onDeleted };
}

describe('DeleteWorkspaceDialog', () => {
  it('uses the shared modal layout and keeps the footer outside the scroll body', () => {
    renderDialog();

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(screen.getByTestId('modal-layout')).toContainElement(body);
    expect(body).not.toContainElement(footer);
  });

  it('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the workspace and cancel leaves it untouched', async () => {
    const user = userEvent.setup();
    const { deleteWorkspace, onOpenChange, onDeleted } = renderDialog();

    expect(screen.getByRole('dialog')).toHaveTextContent('Alpha');
    expect(screen.getByRole('heading', { level: 2, name: 'Delete board?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(deleteWorkspace).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes the workspace, notifies and closes', async () => {
    const user = userEvent.setup();
    const { deleteWorkspace, onOpenChange, onDeleted } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete board' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteWorkspace).toHaveBeenCalledWith({ id: 'ws-alpha', actorUserId: 'user-1' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a friendly error and stays open when deletion fails', async () => {
    const user = userEvent.setup();
    const deleteWorkspace: DeleteWorkspace = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'boom'),
    });
    const { onOpenChange, onDeleted } = renderDialog({ deleteWorkspace });

    await user.click(screen.getByRole('button', { name: 'Delete board' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The service is temporarily unavailable. Please try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
