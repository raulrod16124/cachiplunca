import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacesList } from '../../../../../../presentation/features/workspaces/components/workspaces-list';
import { Workspace } from '../../../../../../domain/workspace';
import { WorkspaceId } from '../../../../../../domain/shared';

function createWorkspace(name: string, updatedAt: Date): Workspace {
  const workspace = Workspace.create({
    id: WorkspaceId.create(`ws-${name}`),
    name,
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
});
