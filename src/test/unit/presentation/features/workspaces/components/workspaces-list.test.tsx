import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacesList } from '../../../../../../presentation/features/workspaces/components/workspaces-list';
import { Workspace } from '../../../../../../domain/workspace';
import type { MembershipRole } from '../../../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';

const CREATED_BY = UserId.create('user-1');

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

function createWorkspace(name: string, updatedAt: Date, description?: string): Workspace {
  const workspace = Workspace.create({
    id: WorkspaceId.create(`ws-${name}`),
    name,
    description,
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
    expect(screen.getByRole('status')).toHaveTextContent('Loading boards');
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

    expect(screen.getByRole('heading', { name: /no boards yet/i })).toBeInTheDocument();
    expect(screen.getByTestId('state-illustration')).toBeInTheDocument();
    expect(
      screen.getByText(/create your first board to start organizing ideas together/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create board/i }));
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

  it('tints workspace card icons with brand surface tokens', () => {
    const workspaces = [
      createWorkspace('A', new Date()),
      createWorkspace('B', new Date()),
      createWorkspace('C', new Date()),
    ];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    const css = styleText();
    expect(css).toContain('var(--cach-card-icon-green)');
    expect(css).toContain('var(--cach-card-icon-green-fg)');
    expect(css).toContain('var(--cach-card-icon-peach)');
    expect(css).toContain('var(--cach-card-icon-peach-fg)');
    expect(css).toContain('var(--cach-card-icon-mustard)');
    expect(css).toContain('var(--cach-card-icon-mustard-fg)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('filters workspaces by name and description', async () => {
    const user = userEvent.setup();
    const workspaces = [
      createWorkspace('Alpha', new Date(), 'Product launch'),
      createWorkspace('Beta', new Date(), 'Research notes'),
    ];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    const search = screen.getByRole('searchbox', { name: /search boards/i });
    expect(search).toHaveAccessibleDescription('2 boards');

    await user.type(search, 'launch');
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Beta' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 board');

    await user.clear(search);
    await user.type(search, 'beta');
    expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
  });

  it('renders an illustrated no-results state and clears the search', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    await user.type(screen.getByRole('searchbox', { name: /search boards/i }), 'Gamma');

    expect(screen.getByRole('heading', { name: /no matching boards/i })).toBeInTheDocument();
    expect(screen.getByTestId('state-illustration')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search boards/i })).toHaveValue('');
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

  it('offers editing to owners only', () => {
    const workspaces = [createWorkspace('Alpha', new Date())];
    const onEdit = jest.fn();

    const { rerender } = render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'editor']])}
        onEdit={onEdit}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();

    rerender(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={workspaces}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onEdit={onEdit}
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit Alpha' })).toBeInTheDocument();
  });

  it('requests editing of the selected workspace', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onEdit = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    expect(onEdit).toHaveBeenCalledWith(workspace);
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
