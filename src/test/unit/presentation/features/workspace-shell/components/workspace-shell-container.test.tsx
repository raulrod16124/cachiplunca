import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  LoadWorkspaceElements,
  LoadWorkspaceElementsResult,
} from '../../../../../../application/queries';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
} from '../../../../../../application/services';
import type { ElementPersistenceOrchestrator } from '../../../../../../application/services';
import { createTextElement } from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { WorkspaceShellContainer } from '../../../../../../presentation/features/workspace-shell/components/workspace-shell-container';
import { FakeElementRepository } from '../../../../../fixtures/fake-element-repository';
import { ManualScheduler, flushMicrotasks } from '../../../../../fixtures/manual-scheduler';

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

const NOOP_ORCHESTRATOR: ElementPersistenceOrchestrator = {
  persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
};

function sequentialElementIds(): () => ElementId {
  let counter = 0;
  return () => ElementId.create(`generated-${++counter}`);
}

interface RenderOptions {
  readonly id?: string;
  readonly loadWorkspaceElements?: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator?: ElementPersistenceOrchestrator;
  readonly persistenceScheduler?: ManualScheduler;
  readonly persistenceDebounceMs?: number;
}

function renderContainer(getWorkspace: GetWorkspace, options: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <WorkspaceShellContainer
        workspaceId={options.id ?? 'ws-test'}
        getWorkspace={getWorkspace}
        loadWorkspaceElements={options.loadWorkspaceElements ?? LOAD_NO_ELEMENTS}
        elementPersistenceOrchestrator={options.elementPersistenceOrchestrator ?? NOOP_ORCHESTRATOR}
        generateElementId={sequentialElementIds()}
        logoutUser={LOGOUT_USER}
        onBack={ON_BACK}
        persistenceScheduler={options.persistenceScheduler}
        persistenceDebounceMs={options.persistenceDebounceMs}
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

  it('persists canvas mutations and restores them on undo', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    await waitFor(async () => {
      await expect(repository.listByWorkspace(WorkspaceId.create('ws-test'))).resolves.toEqual([]);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(async () => {
      const restored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(restored).toHaveLength(1);
    });
  });

  it('surfaces a persistence error explicitly', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({
        status: 'error',
        error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'Write failed'),
      }),
    };

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not save your latest changes. Please try again.',
    );
  });

  it('collapses a drag into a single history entry and persists the final position', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 80, y: 90 } },
      { coords: { x: 100, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    await waitFor(async () => {
      const stored = await repository.findById(ElementId.create('el-1'));
      expect(stored?.position.equals(Position.create(70, 80))).toBe(true);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(async () => {
      const stored = await repository.findById(ElementId.create('el-1'));
      expect(stored?.position.equals(Position.create(30, 40))).toBe(true);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    await flushMicrotasks();

    const stored = await repository.findById(ElementId.create('el-1'));
    expect(stored?.position.equals(Position.create(30, 40))).toBe(true);
  });

  it('debounces drag persistence until the injected scheduler fires', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: scheduler,
    });

    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 80, y: 90 } },
      { coords: { x: 100, y: 110 } },
    ]);

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();
    expect(scheduler.pending).toBe(1);

    await act(async () => {
      scheduler.run();
      await flushMicrotasks();
    });

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
  });

  it('flushes pending persistence on pagehide', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: scheduler,
    });

    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 100, y: 110 } },
    ]);

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await flushMicrotasks();
    });

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
  });

  it('flushes pending persistence when unmounted', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    const { unmount } = renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: scheduler,
    });

    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 100, y: 110 } },
    ]);

    unmount();
    await flushMicrotasks();

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
  });
});
