import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  LoadWorkspaceElements,
  LoadWorkspaceElementsResult,
} from '../../../../../../application/queries';
import { createTextElement } from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { WorkspaceShellContainer } from '../../../../../../presentation/features/workspace-shell/components/workspace-shell-container';

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-test'),
  name: 'Roadmap Q4',
});

const TEXT_ELEMENT = createTextElement({
  id: ElementId.create('el-1'),
  workspaceId: WorkspaceId.create('ws-test'),
  createdBy: UserId.create('user-1'),
  position: Position.create(30, 40),
  size: Size.create(120, 80),
  content: 'Hello',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
});

const LOGOUT_USER = jest.fn().mockResolvedValue({ status: 'ok' as const });
const ON_BACK = jest.fn();

function createGetWorkspace(result: GetWorkspaceResult): GetWorkspace {
  return jest.fn().mockResolvedValue(result);
}

function createLoadWorkspaceElements(result: LoadWorkspaceElementsResult): LoadWorkspaceElements {
  return jest.fn().mockResolvedValue(result);
}

const LOAD_NO_ELEMENTS = createLoadWorkspaceElements({ status: 'ok', elements: [] });

interface RenderOptions {
  readonly id?: string;
  readonly loadWorkspaceElements?: LoadWorkspaceElements;
}

function renderContainer(getWorkspace: GetWorkspace, options: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <WorkspaceShellContainer
        workspaceId={options.id ?? 'ws-test'}
        getWorkspace={getWorkspace}
        loadWorkspaceElements={options.loadWorkspaceElements ?? LOAD_NO_ELEMENTS}
        logoutUser={LOGOUT_USER}
        onBack={ON_BACK}
      />
    </MemoryRouter>,
  );
}

describe('WorkspaceShellContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('renders a loading state while fetching the workspace', () => {
    const getWorkspace = jest.fn().mockImplementation(
      () =>
        new Promise<GetWorkspaceResult>(() => {
          // never resolves
        }),
    );

    renderContainer(getWorkspace);

    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
  });

  it('renders the workspace shell when the workspace is found', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace);

    expect(await screen.findByRole('heading', { name: 'Roadmap Q4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(getWorkspace).toHaveBeenCalledWith('ws-test');
  });

  it('loads the workspace elements and renders them on the canvas', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = createLoadWorkspaceElements({
      status: 'ok',
      elements: [TEXT_ELEMENT],
    });

    renderContainer(getWorkspace, { loadWorkspaceElements });

    const item = await screen.findByTestId('canvas-item-el-1');
    expect(item).toHaveStyle({
      left: '30px',
      top: '40px',
      width: '120px',
      height: '80px',
    });
    expect(loadWorkspaceElements).toHaveBeenCalledWith('ws-test');
  });

  it('renders a loading state while loading the board', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = jest.fn().mockImplementation(
      () =>
        new Promise<LoadWorkspaceElementsResult>(() => {
          // never resolves
        }),
    );

    renderContainer(getWorkspace, { loadWorkspaceElements });

    expect(await screen.findByText('Loading board')).toBeInTheDocument();
  });

  it('renders a board error state and allows retry', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({ status: 'ok', elements: [] });
    const user = userEvent.setup();

    renderContainer(getWorkspace, { loadWorkspaceElements });

    expect(
      await screen.findByRole('heading', { name: 'Could not load board' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(loadWorkspaceElements).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
  });

  it('describes typed board errors with a friendly message', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = createLoadWorkspaceElements({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'Network request failed',
      ),
    });

    renderContainer(getWorkspace, { loadWorkspaceElements });

    expect(
      await screen.findByRole('heading', { name: 'Could not load board' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('We could not reach the server. Check your connection and try again.'),
    ).toBeInTheDocument();
  });

  it('renders a not-found state when the workspace does not exist', async () => {
    const getWorkspace = createGetWorkspace({ status: 'notFound' });

    renderContainer(getWorkspace, { id: 'ws-missing' });

    expect(await screen.findByRole('heading', { name: 'Workspace not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to workspaces' })).toBeInTheDocument();
    expect(getWorkspace).toHaveBeenCalledWith('ws-missing');
  });

  it('renders an error state and allows retry', async () => {
    const getWorkspace = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({ status: 'ok', workspace: WORKSPACE });
    const user = userEvent.setup();

    renderContainer(getWorkspace);

    expect(
      await screen.findByRole('heading', { name: 'Could not load workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(getWorkspace).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Roadmap Q4' })).toBeInTheDocument();
  });

  it('describes typed errors with a friendly message', async () => {
    const getWorkspace = createGetWorkspace({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'Network request failed',
      ),
    });

    renderContainer(getWorkspace);

    expect(
      await screen.findByRole('heading', { name: 'Could not load workspace' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('We could not reach the server. Check your connection and try again.'),
    ).toBeInTheDocument();
  });
});
