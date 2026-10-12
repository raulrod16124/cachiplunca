import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  LoadWorkspaceElements,
  LoadWorkspaceElementsResult,
} from '../../../../../../application/queries';
import { createLoadWorkspaceElements as createLoadWorkspaceElementsQuery } from '../../../../../../application/queries';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
  createRealtimeSubscriptionManager,
  createSelectionStore,
} from '../../../../../../application/services';
import type {
  ElementPersistenceOrchestrator,
  RealtimeSubscriptionManager,
} from '../../../../../../application/services';
import { createTextElement } from '../../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { WorkspaceShellContainer } from '../../../../../../presentation/features/workspace-shell/components/workspace-shell-container';
import { FakeElementRepository } from '../../../../../fixtures/fake-element-repository';
import { FakePresencePort } from '../../../../../fixtures/fake-presence-port';
import { FakeRealtimePort } from '../../../../../fixtures/fake-realtime-port';
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

interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

function setDocumentVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

function resetDocumentVisibility(): void {
  Reflect.deleteProperty(document, 'visibilityState');
}

afterEach(resetDocumentVisibility);

interface RenderOptions {
  readonly id?: string;
  readonly loadWorkspaceElements?: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator?: ElementPersistenceOrchestrator;
  readonly persistenceScheduler?: ManualScheduler;
  readonly persistenceDebounceMs?: number;
  readonly realtimePort?: FakeRealtimePort;
  readonly realtimeSubscriptionManager?: RealtimeSubscriptionManager;
  readonly presencePort?: FakePresencePort;
  readonly localUserId?: string;
  readonly selectionStore?: ReturnType<typeof createSelectionStore>;
}

function renderContainer(getWorkspace: GetWorkspace, options: RenderOptions = {}) {
  const realtimePort = options.realtimePort ?? new FakeRealtimePort();
  const realtimeSubscriptionManager =
    options.realtimeSubscriptionManager ?? createRealtimeSubscriptionManager(realtimePort);

  const view = render(
    <MemoryRouter>
      <WorkspaceShellContainer
        workspaceId={options.id ?? 'ws-test'}
        getWorkspace={getWorkspace}
        loadWorkspaceElements={options.loadWorkspaceElements ?? LOAD_NO_ELEMENTS}
        elementPersistenceOrchestrator={options.elementPersistenceOrchestrator ?? NOOP_ORCHESTRATOR}
        realtimeSubscriptionManager={realtimeSubscriptionManager}
        generateElementId={sequentialElementIds()}
        logoutUser={LOGOUT_USER}
        onBack={ON_BACK}
        persistenceScheduler={options.persistenceScheduler}
        persistenceDebounceMs={options.persistenceDebounceMs}
        presencePort={options.presencePort}
        localUserId={options.localUserId}
        selectionStore={options.selectionStore}
      />
    </MemoryRouter>,
  );

  return { ...view, realtimePort };
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

  it('rolls back an optimistic delete when persistence fails', async () => {
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
    await screen.findByTestId('canvas-item-el-1');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(await screen.findByText('Not saved')).toBeInTheDocument();
    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();
  });

  it('rolls back an optimistic move when persistence fails', async () => {
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

    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 100, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-el-1')).toHaveStyle({
        left: '30px',
        top: '40px',
      }),
    );
  });

  it('preserves a newer remote version when a local write fails', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const gate = createDeferred();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockImplementation(async () => {
        await gate.promise;
        return {
          status: 'error',
          error: createAppError(
            'persistence',
            ERROR_CODES.PERSISTENCE_WRITE_FAILED,
            'Write failed',
          ),
        };
      }),
    };

    const { realtimePort } = renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-el-1');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    const remote = createTextElement({
      id: ElementId.create('el-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(90, 110),
      size: Size.create(120, 80),
      content: 'Hello',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: remote, origin: 'remote' }],
      });
    });

    await screen.findByTestId('canvas-item-el-1');

    await act(async () => {
      gate.resolve();
      await flushMicrotasks();
    });

    expect(screen.getByTestId('canvas-item-el-1')).toHaveStyle({ left: '90px', top: '110px' });
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

  it('shows a saving then saved sync indicator around debounced persistence', async () => {
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
    expect(screen.queryByRole('status')).toBeNull();
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 100, y: 110 } },
    ]);

    expect(screen.getByRole('status')).toHaveTextContent('Saving…');

    await act(async () => {
      scheduler.run();
      await flushMicrotasks();
    });

    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('shows a not-saved sync indicator when persistence fails', async () => {
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

    expect(await screen.findByText('Not saved')).toBeInTheDocument();
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

  it('recovers the persisted board after a refresh', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const loadWorkspaceElements = createLoadWorkspaceElementsQuery(repository);

    const { unmount } = renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
    });

    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();

    unmount();

    renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
    });

    const restored = await screen.findByTestId('canvas-item-el-1');
    expect(restored).toHaveStyle({ left: '30px', top: '40px', width: '120px', height: '80px' });
  });

  it('recovers the last debounced change after a refresh', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const scheduler = new ManualScheduler();
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const loadWorkspaceElements = createLoadWorkspaceElementsQuery(repository);
    const user = userEvent.setup();

    const { unmount } = renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: scheduler,
    });

    const item = await screen.findByTestId('canvas-item-el-1');

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 80, y: 90 } },
      { coords: { x: 100, y: 110 } },
    ]);

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await flushMicrotasks();
    });

    unmount();

    renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: new ManualScheduler(),
    });

    const restored = await screen.findByTestId('canvas-item-el-1');
    expect(restored).toHaveStyle({ left: '70px', top: '80px' });
  });

  it('rolls back the failed change and keeps the previously persisted board after a refresh', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const loadWorkspaceElements = createLoadWorkspaceElementsQuery(repository);
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({
        status: 'error',
        error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'Write failed'),
      }),
    };

    const { unmount } = renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(await screen.findByText('Not saved')).toBeInTheDocument();
    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();

    unmount();

    renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
    });

    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();
  });

  it('flushes pending persistence only when the page becomes hidden', async () => {
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

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();

    setDocumentVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(orchestrator.persistDelta).not.toHaveBeenCalled();

    setDocumentVisibility('hidden');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await flushMicrotasks();
    });

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);

    resetDocumentVisibility();
  });

  it('applies remote element changes to the canvas', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: TEXT_ELEMENT, origin: 'remote' }],
      });
    });

    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();

    const moved = createTextElement({
      id: ElementId.create('el-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(90, 110),
      size: Size.create(120, 80),
      content: 'Hello',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'modified', element: moved, origin: 'remote' }],
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-el-1')).toHaveStyle({ left: '90px', top: '110px' }),
    );

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'removed', elementId: ElementId.create('el-1'), origin: 'remote' }],
      });
    });

    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());
  });

  it('ignores local-origin echoes from the realtime feed', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: TEXT_ELEMENT, origin: 'local' }],
      });
    });

    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());
  });

  it('prunes selection when a remotely deleted element was selected', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const selectionStore = createSelectionStore(['el-1']);
    const { realtimePort } = renderContainer(getWorkspace, { selectionStore });

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'removed', elementId: ElementId.create('el-1'), origin: 'remote' }],
      });
    });

    await waitFor(() => expect(selectionStore.getSnapshot().selectedIds).toEqual([]));
  });

  it('keeps a single realtime subscription per workspace and releases it on unmount', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort, unmount } = renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });
    const workspaceId = WorkspaceId.create('ws-test');
    expect(realtimePort.activeSubscriptionCount(workspaceId)).toBe(1);

    act(() => {
      realtimePort.emit({
        workspaceId,
        changes: [{ kind: 'added', element: TEXT_ELEMENT, origin: 'remote' }],
      });
    });
    await screen.findByTestId('canvas-item-el-1');

    expect(realtimePort.activeSubscriptionCount(workspaceId)).toBe(1);

    unmount();
    expect(realtimePort.activeSubscriptionCount()).toBe(0);
  });

  it('surfaces a collaboration sync error', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emitError(
        WorkspaceId.create('ws-test'),
        createAppError('collaboration', ERROR_CODES.COLLABORATION_SYNC_FAILED, 'Sync failed.'),
      );
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not keep the board in sync. Reconnecting automatically.',
    );
  });

  it('shows a reconnecting indicator while the realtime channel recovers', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);
    const workspaceId = WorkspaceId.create('ws-test');

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emitConnectionChange(workspaceId, 'reconnecting');
    });

    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument();

    act(() => {
      realtimePort.emitConnectionChange(workspaceId, 'connected');
    });

    await waitFor(() => expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument());
  });

  it('flushes pending persistence and clears the collaboration error on reconnect', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const { realtimePort } = renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      persistenceScheduler: scheduler,
    });
    const workspaceId = WorkspaceId.create('ws-test');

    const item = await screen.findByTestId('canvas-item-el-1');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 60, y: 70 } },
      { coords: { x: 100, y: 110 } },
    ]);

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();

    act(() => {
      realtimePort.emitConnectionChange(workspaceId, 'reconnecting');
      realtimePort.emitError(
        workspaceId,
        createAppError('collaboration', ERROR_CODES.COLLABORATION_SYNC_FAILED, 'Sync failed.'),
      );
    });

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await act(async () => {
      realtimePort.emitConnectionChange(workspaceId, 'connected');
      await flushMicrotasks();
    });

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not open extra realtime subscriptions across a reconnect cycle', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);
    const workspaceId = WorkspaceId.create('ws-test');

    await screen.findByRole('application', { name: 'Canvas' });
    expect(realtimePort.activeSubscriptionCount(workspaceId)).toBe(1);

    act(() => {
      realtimePort.emitConnectionChange(workspaceId, 'reconnecting');
    });
    act(() => {
      realtimePort.emitConnectionChange(workspaceId, 'connected');
    });

    expect(realtimePort.activeSubscriptionCount(workspaceId)).toBe(1);
  });

  it('announces local presence when the workspace loads and withdraws it on unmount', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const presencePort = new FakePresencePort();
    const workspaceId = WorkspaceId.create('ws-test');
    const userId = UserId.create('user-local');
    const { unmount } = renderContainer(getWorkspace, {
      presencePort,
      localUserId: userId.value,
    });

    await screen.findByRole('application', { name: 'Canvas' });

    expect(presencePort.presenceOf(workspaceId, userId)).toBeDefined();
    expect(presencePort.activeSubscriptionCount(workspaceId)).toBe(1);

    act(() => {
      unmount();
    });
    await flushMicrotasks();

    expect(presencePort.presenceOf(workspaceId, userId)).toBeUndefined();
    expect(presencePort.activeSubscriptionCount()).toBe(0);
  });

  it('does not announce presence while the workspace is still loading', async () => {
    const getWorkspace = jest.fn().mockImplementation(
      () =>
        new Promise<GetWorkspaceResult>(() => {
          // never resolves
        }),
    );
    const presencePort = new FakePresencePort();
    const userId = UserId.create('user-local');

    renderContainer(getWorkspace, { presencePort, localUserId: userId.value });

    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
    await flushMicrotasks();

    expect(presencePort.presenceOf(WorkspaceId.create('ws-test'), userId)).toBeUndefined();
  });

  it('withdraws local presence on pagehide', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const presencePort = new FakePresencePort();
    const workspaceId = WorkspaceId.create('ws-test');
    const userId = UserId.create('user-local');

    renderContainer(getWorkspace, { presencePort, localUserId: userId.value });

    await screen.findByRole('application', { name: 'Canvas' });
    expect(presencePort.presenceOf(workspaceId, userId)).toBeDefined();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await flushMicrotasks();

    expect(presencePort.presenceOf(workspaceId, userId)).toBeUndefined();
  });

  it('does not announce presence when presence is not wired to a local user', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const presencePort = new FakePresencePort();

    renderContainer(getWorkspace, { presencePort });

    await screen.findByRole('application', { name: 'Canvas' });
    await flushMicrotasks();

    expect(presencePort.activePresenceCount(WorkspaceId.create('ws-test'))).toBe(0);
  });

  it('surfaces a presence channel error as a collaboration alert', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const presencePort = new FakePresencePort();
    jest
      .spyOn(presencePort, 'announce')
      .mockRejectedValue(
        createAppError(
          'collaboration',
          ERROR_CODES.COLLABORATION_SYNC_FAILED,
          'Presence channel failed.',
        ),
      );

    renderContainer(getWorkspace, { presencePort, localUserId: 'user-local' });

    await act(async () => {
      await flushMicrotasks();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not keep the board in sync. Reconnecting automatically.',
    );
  });
});
