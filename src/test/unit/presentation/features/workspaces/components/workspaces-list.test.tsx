import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacesList } from '../../../../../../presentation/features/workspaces/components/workspaces-list';
import { Workspace } from '../../../../../../domain/workspace';
import type { MembershipRole } from '../../../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';

const CREATED_BY = UserId.create('user-1');

function createWorkspace(name: string, updatedAt: Date): Workspace {
  const workspace = Workspace.create({
    id: WorkspaceId.create(`ws-${name}`),
    name,
    createdBy: CREATED_BY,
  });
  // Override updatedAt for deterministic tests
  Object.defineProperty(workspace, 'updatedAt', {
    value: updatedAt,
    writable: false,
    configurable: true,
  });
  return workspace;
}

describe('WorkspacesList', () => {
  const baseProps = {
    rolesByWorkspaceId: new Map<string, MembershipRole>(),
    onRetry: jest.fn(),
    onCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons', () => {
    render(<WorkspacesList status="loading" workspaces={[]} {...baseProps} />);

    expect(screen.getAllByTestId(/skeleton/i).length).toBeGreaterThan(0);
  });

  it('exposes an accessible busy status while loading', () => {
    render(<WorkspacesList status="loading" workspaces={[]} {...baseProps} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading workspaces');
  });

  it('renders error state with retry', async () => {
    const user = userEvent.setup();
    render(
      <WorkspacesList
        status="error"
        workspaces={[]}
        errorMessage="Failed to load"
        {...baseProps}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state with create CTA', async () => {
    const user = userEvent.setup();
    render(<WorkspacesList status="success" workspaces={[]} {...baseProps} />);

    expect(screen.getByRole('heading', { name: /no workspaces yet/i })).toBeInTheDocument();
    expect(
      screen.getByText(/create your first workspace to start organizing ideas together/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create workspace/i }));
    expect(baseProps.onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders data state with workspace cards', () => {
    const now = new Date('2025-10-08T12:30:00Z');
    const earlier = new Date('2025-10-07T09:00:00Z');
    const workspaces = [createWorkspace('Alpha', now), createWorkspace('Beta', earlier)];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('offers delete to owners only', () => {
    const workspaces = [createWorkspace('Alpha', new Date())];
    const onRequestDelete = jest.fn();
    const roles = new Map<string, MembershipRole>([['ws-Alpha', 'editor']]);

    const { rerender } = render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={roles}
        onRequestDelete={onRequestDelete}
      />,
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    rerender(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onRequestDelete={onRequestDelete}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete Alpha' })).toBeInTheDocument();
  });

  it('requests deletion of the selected workspace', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onRequestDelete = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onRequestDelete={onRequestDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    expect(onRequestDelete).toHaveBeenCalledWith(workspace);
  });

  it('offers duplication to owners only', () => {
    const workspaces = [createWorkspace('Alpha', new Date())];
    const onDuplicate = jest.fn();

    const { rerender } = render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'editor']])}
        onDuplicate={onDuplicate}
      />,
    );

    expect(screen.queryByRole('button', { name: /duplicate/i })).not.toBeInTheDocument();

    rerender(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onDuplicate={onDuplicate}
      />,
    );

    expect(screen.getByRole('button', { name: 'Duplicate Alpha' })).toBeInTheDocument();
  });

  it('requests duplication of the selected workspace', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onDuplicate = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onDuplicate={onDuplicate}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha' }));
    expect(onDuplicate).toHaveBeenCalledWith(workspace);
  });

  it('disables the duplicate action while the workspace is being copied', () => {
    const workspace = createWorkspace('Alpha', new Date());

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onDuplicate={jest.fn()}
        duplicatingWorkspaceId="ws-Alpha"
      />,
    );

    expect(screen.getByRole('button', { name: 'Duplicate Alpha' })).toBeDisabled();
  });
});
