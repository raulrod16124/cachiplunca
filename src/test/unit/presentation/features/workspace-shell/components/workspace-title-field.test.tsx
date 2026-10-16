import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../../setup/render-with-theme';
import type { UpdateWorkspaceResult } from '../../../../../../application/commands';
import { toAppError } from '../../../../../../shared/errors';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { WorkspaceTitleField } from '../../../../../../presentation/features/workspace-shell/components/workspace-title-field';
import { appTheme } from '../../../../../../presentation/styles';

function okResult(): UpdateWorkspaceResult {
  return {
    status: 'ok',
    workspace: Workspace.create({
      id: WorkspaceId.create('ws-1'),
      name: 'Renamed',
      createdBy: UserId.create('user-1'),
    }),
  };
}

function errorResult(): UpdateWorkspaceResult {
  return { status: 'error', error: toAppError(new Error('boom')) };
}

describe('WorkspaceTitleField', () => {
  it('renders a read-only heading when no rename handler is provided', () => {
    render(<WorkspaceTitleField name="Roadmap Q4" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Roadmap Q4' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename workspace' })).not.toBeInTheDocument();
  });

  it('renders the title at a reduced size that wraps to two lines', () => {
    render(
      <WorkspaceTitleField name="A very long workspace name that has to wrap onto several lines" />,
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveStyle({ fontSize: appTheme.font.size.lg });
    expect(heading).toHaveStyle({ overflow: 'hidden' });
    expect(heading).not.toHaveStyle({ whiteSpace: 'nowrap' });
  });

  it('enters edit mode and commits with Enter', async () => {
    const onRename = jest.fn().mockResolvedValue(okResult());
    const user = userEvent.setup();
    render(<WorkspaceTitleField name="Roadmap Q4" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Rename workspace' }));
    const input = screen.getByRole('textbox', { name: 'Workspace name' });
    expect(input).toHaveValue('Roadmap Q4');

    await user.clear(input);
    await user.type(input, 'Roadmap 2027{Enter}');

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Roadmap 2027'));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Roadmap Q4' })).toBeInTheDocument(),
    );
  });

  it('cancels the edit without calling the handler on Escape', async () => {
    const onRename = jest.fn().mockResolvedValue(okResult());
    const user = userEvent.setup();
    render(<WorkspaceTitleField name="Roadmap Q4" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Rename workspace' }));
    await user.clear(screen.getByRole('textbox', { name: 'Workspace name' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox', { name: 'Workspace name' })).not.toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('skips the handler when the name is unchanged', async () => {
    const onRename = jest.fn().mockResolvedValue(okResult());
    const user = userEvent.setup();
    render(<WorkspaceTitleField name="Roadmap Q4" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Rename workspace' }));
    fireEvent.blur(screen.getByRole('textbox', { name: 'Workspace name' }));

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Workspace name' })).not.toBeInTheDocument(),
    );
    expect(onRename).not.toHaveBeenCalled();
  });

  it('surfaces a field error when the rename is rejected as invalid', async () => {
    const onRename = jest.fn().mockResolvedValue({
      status: 'invalid-input',
      fieldErrors: { name: 'Enter a workspace name.' },
    });
    const user = userEvent.setup();
    render(<WorkspaceTitleField name="Roadmap Q4" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Rename workspace' }));
    const input = screen.getByRole('textbox', { name: 'Workspace name' });
    await user.clear(input);
    await user.type(input, '   {Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a workspace name.');
    expect(screen.getByRole('textbox', { name: 'Workspace name' })).toBeInTheDocument();
  });

  it('surfaces a generic error when the rename fails', async () => {
    const onRename = jest.fn().mockResolvedValue(errorResult());
    const user = userEvent.setup();
    render(<WorkspaceTitleField name="Roadmap Q4" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Rename workspace' }));
    const input = screen.getByRole('textbox', { name: 'Workspace name' });
    await user.clear(input);
    await user.type(input, 'New name{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not rename this workspace.',
    );
  });
});
