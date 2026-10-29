import { render, screen, within } from '@testing-library/react';
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

function createWorkspace(
  name: string,
  activityAt: Date,
  description?: string,
  createdAt: Date = activityAt,
): Workspace {
  return Workspace.create({
    id: WorkspaceId.create(`ws-${name}`),
    name,
    description,
    createdBy: CREATED_BY,
    createdAt,
    updatedAt: createdAt,
    lastActivityAt: activityAt,
  });
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

    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]).toHaveAttribute('aria-busy', 'true');
    expect(status[0]).toHaveAttribute('aria-live', 'polite');
    expect(status[0]).toHaveTextContent('Loading boards');
    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
  });

  it('does not render a nested main landmark while loading', () => {
    render(<WorkspacesList status="loading" workspaces={[]} {...baseProps} />);

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('keeps the loading skeletons inside the status region', () => {
    render(<WorkspacesList status="loading" workspaces={[]} {...baseProps} />);

    const status = screen.getByRole('status');
    expect(status).toContainElement(screen.getAllByTestId(/skeleton/i)[0]);
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

  it('renders a custom empty state when provided', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    render(
      <WorkspacesList
        status="success"
        workspaces={[]}
        emptyState={{
          title: 'No favorite boards yet',
          description: 'Mark a board with the star icon to see it here.',
          actionLabel: 'Browse boards',
          onAction,
        }}
        {...baseProps}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No favorite boards yet' })).toBeInTheDocument();
    expect(screen.getByText('Mark a board with the star icon to see it here.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Browse boards' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(baseProps.onCreate).not.toHaveBeenCalled();
  });

  it('uses the custom loading label', () => {
    render(
      <WorkspacesList
        status="loading"
        workspaces={[]}
        loadingLabel="Loading favorites"
        {...baseProps}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading favorites');
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

  it('renders both view controls with grid active by default', () => {
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    const grid = screen.getByRole('button', { name: 'Grid view' });
    const list = screen.getByRole('button', { name: 'List view' });

    expect(screen.getByRole('group', { name: 'Board layout' })).toContainElement(grid);
    expect(grid).toHaveAttribute('aria-pressed', 'true');
    expect(list).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to list view and keeps the same workspaces', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date()), createWorkspace('Beta', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('renders a create board action in list view and calls onCreate', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'List view' }));

    const createRow = screen.getByTestId('workspaces-create-list');
    const createButton = within(createRow).getByRole('button', { name: 'Start now' });

    expect(createButton.tagName).toBe('BUTTON');
    expect(within(createRow).getByRole('heading', { name: 'New blank board' })).toBeInTheDocument();
    expect(
      within(createRow).getByText(/start an infinite canvas with sticky notes/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    const list = screen.getByTestId('workspaces-list');
    expect(list.compareDocumentPosition(createRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(createButton);
    expect(baseProps.onCreate).toHaveBeenCalledTimes(1);
  });

  it('creates a board when the list create icon is clicked', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'List view' }));

    const icon = screen.getByTestId('workspaces-create-list-icon');
    expect(icon).toBeInstanceOf(HTMLButtonElement);
    expect(icon).toHaveAccessibleName('New blank board');

    await user.click(icon);
    expect(baseProps.onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides the list create action when onCreateCard is false', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    const { rerender } = render(
      <WorkspacesList status="success" workspaces={workspaces} {...baseProps} />,
    );

    await user.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByTestId('workspaces-create-list')).toBeInTheDocument();

    rerender(
      <WorkspacesList
        status="success"
        workspaces={workspaces}
        onCreateCard={false}
        {...baseProps}
      />,
    );

    expect(screen.queryByTestId('workspaces-create-list')).not.toBeInTheDocument();
  });

  it('hides the list create action when the filter has no results', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByTestId('workspaces-create-list')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search boards/i }), 'Gamma');

    expect(screen.getByRole('heading', { name: /no matching boards/i })).toBeInTheDocument();
    expect(screen.queryByTestId('workspaces-create-list')).not.toBeInTheDocument();
  });

  it('creates a board when the grid create icon is clicked', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    const icon = screen.getByTestId('workspaces-create-icon');
    expect(icon).toBeInstanceOf(HTMLButtonElement);
    expect(icon).toHaveAccessibleName('New blank board');

    await user.click(icon);
    expect(baseProps.onCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps the grid create card unchanged', async () => {
    const user = userEvent.setup();
    const workspaces = [createWorkspace('Alpha', new Date())];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    const grid = screen.getByTestId('workspaces-grid');
    expect(screen.queryByTestId('workspaces-create-list')).not.toBeInTheDocument();
    expect(within(grid).getByRole('heading', { name: 'New blank board' })).toBeInTheDocument();
    expect(
      within(grid).getByText(/start an infinite canvas with sticky notes/i),
    ).toBeInTheDocument();

    await user.click(within(grid).getByRole('button', { name: 'Start now' }));
    expect(baseProps.onCreate).toHaveBeenCalledTimes(1);
  });

  it('filters workspaces and keeps the selected list view', async () => {
    const user = userEvent.setup();
    const workspaces = [
      createWorkspace('Alpha', new Date(), 'Product launch'),
      createWorkspace('Beta', new Date(), 'Research notes'),
    ];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'List view' }));
    const search = screen.getByRole('searchbox', { name: /search boards/i });

    await user.type(search, 'launch');

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Beta' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 board');
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps permission-based actions available in list view', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onEdit = jest.fn();
    const onDuplicate = jest.fn();
    const onRequestDelete = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onRequestDelete={onRequestDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByRole('button', { name: 'Edit Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Alpha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    expect(onEdit).toHaveBeenCalledWith(workspace);
  });

  it('hides all workspace actions for editors in list view', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'editor']])}
        onEdit={jest.fn()}
        onDuplicate={jest.fn()}
        onRequestDelete={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /duplicate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows last activity and creation dates on each card', () => {
    const createdAt = new Date('2025-01-02T00:00:00Z');
    const activityAt = new Date('2025-03-04T00:00:00Z');
    const workspaces = [createWorkspace('Alpha', activityAt, undefined, createdAt)];

    render(<WorkspacesList status="success" workspaces={workspaces} {...baseProps} />);

    expect(screen.getByText(/^Updated/)).toBeInTheDocument();
    expect(screen.getByText(/^Created/)).toBeInTheDocument();
  });

  it('renders uploaded covers and a themed default background when missing', () => {
    const withCover = createWorkspace('Alpha', new Date()).update({
      coverImageUrl: 'https://storage.test/workspaces/ws-Alpha/images/cover.png',
      coverImageStoragePath: 'workspaces/ws-Alpha/images/cover.png',
    });
    const withoutCover = createWorkspace('Beta', new Date());

    render(
      <WorkspacesList status="success" workspaces={[withCover, withoutCover]} {...baseProps} />,
    );

    expect(screen.getAllByTestId('workspace-cover-card')).toHaveLength(2);
    expect(
      document.querySelector(
        'img[src="https://storage.test/workspaces/ws-Alpha/images/cover.png"]',
      ),
    ).toBeInTheDocument();
    expect(styleText()).toContain('linear-gradient');
  });

  it('renders the workspace type icon when there is no cover', () => {
    const travel = Workspace.create({
      id: WorkspaceId.create('ws-travel'),
      name: 'Trip',
      createdBy: CREATED_BY,
      type: 'travel',
    });
    const general = Workspace.create({
      id: WorkspaceId.create('ws-general'),
      name: 'General board',
      createdBy: CREATED_BY,
    });

    render(<WorkspacesList status="success" workspaces={[travel, general]} {...baseProps} />);

    const cards = screen.getAllByTestId('workspace-cover-card');
    expect(cards[0].querySelector('.lucide-calendar-days')).not.toBeNull();
    expect(cards[1].querySelector('.lucide-shapes')).not.toBeNull();
  });

  it('gives the cover image priority over the type icon', () => {
    const typedWithCover = Workspace.create({
      id: WorkspaceId.create('ws-typed-cover'),
      name: 'Typed cover',
      createdBy: CREATED_BY,
      type: 'travel',
    }).update({
      coverImageUrl: 'https://storage.test/workspaces/ws-typed-cover/images/cover.png',
      coverImageStoragePath: 'workspaces/ws-typed-cover/images/cover.png',
    });

    render(<WorkspacesList status="success" workspaces={[typedWithCover]} {...baseProps} />);

    const card = screen.getByTestId('workspace-cover-card');
    expect(card.querySelector('img')).not.toBeNull();
    expect(card.querySelector('.lucide-calendar-days')).toBeNull();
  });

  it('renders covers as thumbnails in list view', async () => {
    const user = userEvent.setup();

    const workspace = createWorkspace('Alpha', new Date()).update({
      coverImageUrl: 'https://storage.test/workspaces/ws-Alpha/images/cover.png',
      coverImageStoragePath: 'workspaces/ws-Alpha/images/cover.png',
    });

    render(<WorkspacesList status="success" workspaces={[workspace]} {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByTestId('workspace-cover-list')).toBeInTheDocument();
    expect(
      document.querySelector(
        'img[src="https://storage.test/workspaces/ws-Alpha/images/cover.png"]',
      ),
    ).toBeInTheDocument();
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

  it('renders an accessible favorite action in grid view without selecting the board', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onToggleFavorite = jest.fn();
    const onSelect = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    const favorite = screen.getByRole('button', { name: 'Add to favorites Alpha' });
    expect(favorite).toHaveAttribute('aria-pressed', 'false');

    await user.click(favorite);

    expect(onToggleFavorite).toHaveBeenCalledWith(workspace);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marks an existing favorite as pressed in list view', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace('Alpha', new Date());
    const onToggleFavorite = jest.fn();

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onToggleFavorite={onToggleFavorite}
        favoriteWorkspaceIds={new Set(['ws-Alpha'])}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'List view' }));

    const favorite = screen.getByRole('button', { name: 'Remove from favorites Alpha' });
    expect(favorite).toHaveAttribute('aria-pressed', 'true');

    await user.click(favorite);

    expect(onToggleFavorite).toHaveBeenCalledWith(workspace);
  });

  it('disables the favorite action while the toggle is pending', () => {
    const workspace = createWorkspace('Alpha', new Date());

    render(
      <WorkspacesList
        {...baseProps}
        status="success"
        workspaces={[workspace]}
        rolesByWorkspaceId={new Map<string, MembershipRole>([['ws-Alpha', 'owner']])}
        onToggleFavorite={jest.fn()}
        pendingFavoriteWorkspaceIds={new Set(['ws-Alpha'])}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add to favorites Alpha' })).toBeDisabled();
  });
});
