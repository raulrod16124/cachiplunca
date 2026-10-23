import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaceMembers,
  LoadWorkspaceElements,
  LoadWorkspaceElementsResult,
} from '../../../../../../application/queries';
import type { MembershipRole } from '../../../../../../domain/membership';
import {
  createListPendingInvitations,
  createListWorkspaceMembers,
  createLoadWorkspaceElements as createLoadWorkspaceElementsQuery,
} from '../../../../../../application/queries';
import {
  createChangeMemberRole,
  createInviteMember,
  createLeaveWorkspace,
  createRemoveMember,
  type ChangeMemberRole,
  type InviteMember,
  type LeaveWorkspace,
  type RemoveMember,
} from '../../../../../../application/commands';
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
import type {
  AuthUser,
  FileDownloadPort,
  TextFileDownload,
} from '../../../../../../application/ports';
import {
  createFrameElement,
  createImageElement,
  createTextElement,
  richTextFromPlain,
} from '../../../../../../domain/element';
import type { ImageServices } from '../../../../../../application/image-services';
import { Presence } from '../../../../../../domain/collaboration';
import {
  ElementId,
  InvitationId,
  Position,
  Size,
  UserId,
  WorkspaceId,
} from '../../../../../../domain/shared';

jest.mock('../../../../../../presentation/canvas/components/rich-text-editor', () =>
  require('../../../../../../test/fixtures/rich-text-editor-stub'),
);
import { Workspace } from '../../../../../../domain/workspace';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { WorkspaceShellContainer } from '../../../../../../presentation/features/workspace-shell/components/workspace-shell-container';
import { FakeElementRepository } from '../../../../../fixtures/fake-element-repository';
import { FakeInvitationRepository } from '../../../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../../../fixtures/fake-membership-repository';
import { FakePresencePort } from '../../../../../fixtures/fake-presence-port';
import { FakeRealtimePort } from '../../../../../fixtures/fake-realtime-port';
import { ManualScheduler, flushMicrotasks } from '../../../../../fixtures/manual-scheduler';

const CREATED_BY = UserId.create('user-1');

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-test'),
  name: 'Roadmap Q4',
  createdBy: CREATED_BY,
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

const IMAGE_STORAGE_PATH = 'workspaces/ws-test/images/image-1-diagram.png';

const IMAGE_ELEMENT = createImageElement({
  id: ElementId.create('image-1'),
  workspaceId: WorkspaceId.create('ws-test'),
  createdBy: UserId.create('user-1'),
  position: Position.create(30, 40),
  size: Size.create(240, 160),
  src: `https://storage.test/${IMAGE_STORAGE_PATH}`,
  alt: 'Diagram',
  storagePath: IMAGE_STORAGE_PATH,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
});

const FRAME_ELEMENT = createFrameElement({
  id: ElementId.create('frame-1'),
  workspaceId: WorkspaceId.create('ws-test'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(400, 300),
  title: 'Intro',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
});

const SECOND_FRAME_ELEMENT = createFrameElement({
  id: ElementId.create('frame-2'),
  workspaceId: WorkspaceId.create('ws-test'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 600),
  size: Size.create(400, 300),
  title: 'Details',
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

function createGetWorkspaceRole(role: MembershipRole | null): GetWorkspaceRole {
  return jest
    .fn()
    .mockResolvedValue(role === null ? { status: 'notFound' } : { status: 'ok', role });
}

const LOAD_NO_ELEMENTS = createLoadWorkspaceElements({ status: 'ok', elements: [] });

const NOOP_ORCHESTRATOR: ElementPersistenceOrchestrator = {
  persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
};

function sequentialElementIds(): () => ElementId {
  let counter = 0;
  return () => ElementId.create(`generated-${++counter}`);
}

async function seedMembership(
  repository: FakeMembershipRepository,
  userId: string,
  role: MembershipRole,
): Promise<void> {
  await repository.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create('ws-test'),
    role,
  });
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
  readonly imageCleanupScheduler?: ManualScheduler;
  readonly imageCleanupDelayMs?: number;
  readonly imageServices?: ImageServices;
  readonly realtimePort?: FakeRealtimePort;
  readonly realtimeSubscriptionManager?: RealtimeSubscriptionManager;
  readonly presencePort?: FakePresencePort;
  readonly localUserId?: string;
  readonly currentUser?: AuthUser | null;
  readonly selectionStore?: ReturnType<typeof createSelectionStore>;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly getWorkspaceRole?: GetWorkspaceRole;
  readonly role?: MembershipRole | null;
  readonly listWorkspaceMembers?: ListWorkspaceMembers;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly leaveWorkspace?: LeaveWorkspace;
  readonly fileDownload?: FileDownloadPort;
}

function renderContainer(getWorkspace: GetWorkspace, options: RenderOptions = {}) {
  const realtimePort = options.realtimePort ?? new FakeRealtimePort();
  const realtimeSubscriptionManager =
    options.realtimeSubscriptionManager ?? createRealtimeSubscriptionManager(realtimePort);
  const getWorkspaceRole =
    options.getWorkspaceRole ??
    (options.role === undefined ? undefined : createGetWorkspaceRole(options.role));

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
        imageCleanupScheduler={options.imageCleanupScheduler}
        imageCleanupDelayMs={options.imageCleanupDelayMs}
        imageServices={options.imageServices}
        presencePort={options.presencePort}
        localUserId={options.localUserId}
        currentUser={options.currentUser}
        selectionStore={options.selectionStore}
        inviteMember={options.inviteMember}
        listPendingInvitations={options.listPendingInvitations}
        getWorkspaceRole={getWorkspaceRole}
        listWorkspaceMembers={options.listWorkspaceMembers}
        changeMemberRole={options.changeMemberRole}
        removeMember={options.removeMember}
        leaveWorkspace={options.leaveWorkspace}
        fileDownload={options.fileDownload}
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

    expect(screen.getByRole('status')).toHaveTextContent('Loading board');
  });

  it('renders the workspace shell when the workspace is found', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace);

    expect(await screen.findByRole('heading', { name: 'Roadmap Q4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to boards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(document.querySelector('[data-surface="stitch"]')).toBeInTheDocument();
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

  it('presents the frames, navigates and returns to edit mode without persisting', async () => {
    const user = userEvent.setup();
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = createLoadWorkspaceElements({
      status: 'ok',
      elements: [FRAME_ELEMENT, SECOND_FRAME_ELEMENT],
    });
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    renderContainer(getWorkspace, {
      loadWorkspaceElements,
      elementPersistenceOrchestrator: orchestrator,
    });

    await screen.findByTestId('canvas-item-frame-1');

    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const present = screen.getByRole('button', { name: 'Present' });
    expect(present).toBeEnabled();

    await user.click(present);

    expect(screen.getByTestId('board-presentation')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Task plan' })).not.toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Frame 1 of 2');

    await user.click(screen.getByRole('button', { name: 'Next frame' }));
    expect(screen.getByRole('status')).toHaveTextContent('Frame 2 of 2');

    fireEvent.keyDown(screen.getByTestId('board-presentation'), { key: 'Escape' });

    expect(screen.queryByTestId('board-presentation')).not.toBeInTheDocument();
    expect(screen.getByTestId('canvas-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Present' })).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-readonly', 'false');
    expect(canvas).toHaveFocus();
    expect(orchestrator.persistDelta).not.toHaveBeenCalled();
  });

  it('allows presenting read-only boards', async () => {
    const user = userEvent.setup();
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const loadWorkspaceElements = createLoadWorkspaceElements({
      status: 'ok',
      elements: [FRAME_ELEMENT],
    });

    renderContainer(getWorkspace, { loadWorkspaceElements, role: 'viewer' });

    await screen.findByTestId('canvas-item-frame-1');
    expect(screen.getByRole('application', { name: 'Canvas' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Present' }));

    expect(screen.getByTestId('board-presentation')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Frame 1 of 1');
  });

  it('disables the presentation when the board has no frames', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });

    expect(screen.getByRole('button', { name: 'Present' })).toBeDisabled();
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

    expect(await screen.findByRole('heading', { name: 'Board not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to boards' })).toBeInTheDocument();
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
      await screen.findByRole('heading', { name: 'Could not load board' }),
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
      await screen.findByRole('heading', { name: 'Could not load board' }),
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

  it('deletes the storage object after Firestore confirms an image removal', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(IMAGE_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const imageCleanupScheduler = new ManualScheduler();
    const deleteImage = jest.fn(async () => ({ status: 'ok' as const }));

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [IMAGE_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      imageCleanupScheduler,
      imageServices: {
        uploadImage: jest.fn(),
        deleteImage,
      },
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-image-1');
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    await waitFor(async () => {
      await expect(repository.listByWorkspace(WorkspaceId.create('ws-test'))).resolves.toEqual([]);
    });
    await waitFor(() => expect(imageCleanupScheduler.pending).toBe(1));

    act(() => imageCleanupScheduler.run());
    await flushMicrotasks();

    expect(deleteImage).toHaveBeenCalledWith({ storagePath: IMAGE_STORAGE_PATH });
  });

  it('cancels the storage cleanup when the image deletion is undone', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(IMAGE_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const imageCleanupScheduler = new ManualScheduler();
    const deleteImage = jest.fn(async () => ({ status: 'ok' as const }));

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [IMAGE_ELEMENT],
      }),
      elementPersistenceOrchestrator: orchestrator,
      imageCleanupScheduler,
      imageServices: {
        uploadImage: jest.fn(),
        deleteImage,
      },
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-image-1');
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    await waitFor(() => expect(imageCleanupScheduler.pending).toBe(1));

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(async () => {
      const restored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(restored).toHaveLength(1);
    });

    act(() => imageCleanupScheduler.run());
    await flushMicrotasks();

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('does not delete a storage object still referenced by another image', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    const copy = createImageElement({
      id: ElementId.create('image-2'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(60, 80),
      size: Size.create(240, 160),
      src: IMAGE_ELEMENT.src,
      storagePath: IMAGE_STORAGE_PATH,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    await repository.saveMany([IMAGE_ELEMENT, copy]);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const imageCleanupScheduler = new ManualScheduler();
    const deleteImage = jest.fn(async () => ({ status: 'ok' as const }));

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [IMAGE_ELEMENT, copy],
      }),
      elementPersistenceOrchestrator: orchestrator,
      imageCleanupScheduler,
      selectionStore: createSelectionStore(['image-1']),
      imageServices: {
        uploadImage: jest.fn(),
        deleteImage,
      },
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-image-1');
    fireEvent.keyDown(canvas, { key: 'Delete' });

    await waitFor(async () => {
      const remaining = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(remaining.map((element) => element.id.value)).toEqual(['image-2']);
    });

    act(() => imageCleanupScheduler.run());
    await flushMicrotasks();

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('persists alignment and restores the previous positions on undo', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    const second = createTextElement({
      id: ElementId.create('el-2'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(300, 200),
      size: Size.create(120, 80),
      content: 'Second',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    await repository.save(TEXT_ELEMENT);
    await repository.save(second);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const user = userEvent.setup();

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT, second],
      }),
      elementPersistenceOrchestrator: orchestrator,
      selectionStore: createSelectionStore(['el-1', 'el-2']),
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await user.click(await screen.findByRole('button', { name: 'Align and distribute' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Align left' }));

    await waitFor(async () => {
      const stored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(stored.find((element) => element.id.value === 'el-2')?.position.x).toBe(30);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(async () => {
      const restored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(restored.find((element) => element.id.value === 'el-2')?.position.x).toBe(300);
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

  it('collapses a rotation into a single history entry and persists it', async () => {
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

    await user.click(item);

    const handle = await screen.findByTestId('rotate-handle');

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 90, y: 40 } },
      { coords: { x: 130, y: 80 } },
      { keys: '[/MouseLeft]' },
    ]);

    await waitFor(async () => {
      const stored = await repository.findById(ElementId.create('el-1'));
      expect(stored?.rotation).toBeCloseTo(90);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(async () => {
      const stored = await repository.findById(ElementId.create('el-1'));
      expect(stored?.rotation).toBe(0);
    });

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    await flushMicrotasks();

    const stored = await repository.findById(ElementId.create('el-1'));
    expect(stored?.rotation).toBe(0);
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

  it('applies a remote move and resize to the canvas', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const { realtimePort } = renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: TEXT_ELEMENT, origin: 'remote' }],
      });
    });

    expect(await screen.findByTestId('canvas-item-el-1')).toHaveStyle({
      left: '30px',
      top: '40px',
      width: '120px',
      height: '80px',
    });

    const resized = createTextElement({
      id: ElementId.create('el-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(150, 260),
      size: Size.create(300, 200),
      content: 'Hello',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'modified', element: resized, origin: 'remote' }],
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-el-1')).toHaveStyle({
        left: '150px',
        top: '260px',
        width: '300px',
        height: '200px',
      }),
    );
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

  it('keeps remote changes when undoing a local delete', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
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
    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());

    const remote = createTextElement({
      id: ElementId.create('remote-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-2'),
      position: Position.create(200, 300),
      size: Size.create(120, 80),
      content: 'Remote',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: remote, origin: 'remote' }],
      });
    });

    await screen.findByTestId('canvas-item-remote-1');

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(() => expect(screen.getByTestId('canvas-item-el-1')).toBeInTheDocument());
    expect(screen.getByTestId('canvas-item-remote-1')).toHaveStyle({
      left: '200px',
      top: '300px',
    });
    expect(realtimePort.activeSubscriptionCount(WorkspaceId.create('ws-test'))).toBe(1);
  });

  it('does not overwrite a newer remote version of an element when undoing a delete', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
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
    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());

    const recreated = createTextElement({
      id: ElementId.create('el-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-2'),
      position: Position.create(200, 300),
      size: Size.create(120, 80),
      content: 'Recreated remotely',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: recreated, origin: 'remote' }],
      });
    });

    await screen.findByTestId('canvas-item-el-1');

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-el-1')).toHaveStyle({
        left: '200px',
        top: '300px',
      }),
    );
  });

  it('keeps remote changes when redoing a local delete', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    await repository.save(TEXT_ELEMENT);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
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
    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    await screen.findByTestId('canvas-item-el-1');

    const remote = createTextElement({
      id: ElementId.create('remote-1'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-2'),
      position: Position.create(200, 300),
      size: Size.create(120, 80),
      content: 'Remote',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    act(() => {
      realtimePort.emit({
        workspaceId: WorkspaceId.create('ws-test'),
        changes: [{ kind: 'added', element: remote, origin: 'remote' }],
      });
    });

    await screen.findByTestId('canvas-item-remote-1');

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true, shiftKey: true });

    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());
    expect(screen.getByTestId('canvas-item-remote-1')).toBeInTheDocument();
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
      currentUser: {
        uid: userId.value,
        email: 'ada@example.com',
        emailVerified: true,
        displayName: null,
      },
    });

    await screen.findByRole('application', { name: 'Canvas' });

    expect(presencePort.presenceOf(workspaceId, userId)?.displayName).toBe('ada');
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

    expect(screen.getByRole('status')).toHaveTextContent('Loading board');
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

  it('shows other connected collaborators in the workspace top bar', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const presencePort = new FakePresencePort();
    const workspaceId = WorkspaceId.create('ws-test');

    renderContainer(getWorkspace, { presencePort, localUserId: 'user-local' });

    await screen.findByRole('application', { name: 'Canvas' });

    await act(async () => {
      await presencePort.announce(
        Presence.create({ userId: UserId.create('user-remote'), workspaceId }),
      );
      await flushMicrotasks();
    });

    expect(screen.getByTestId('connected-users')).toBeInTheDocument();
    expect(screen.getByText('1 connected')).toBeInTheDocument();
  });

  it('exports the current board as versioned JSON for a viewer', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const downloadTextFile = jest.fn<void, [TextFileDownload]>();
    const fileDownload: FileDownloadPort = { downloadTextFile };

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      localUserId: 'user-local',
      role: 'viewer',
      fileDownload,
    });

    await screen.findByTestId('canvas-item-el-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Export board' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as JSON' }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);

    const file = downloadTextFile.mock.calls[0]?.[0];

    if (file === undefined) {
      throw new Error('Expected a downloaded file');
    }

    expect(file.fileName).toMatch(/^roadmap-q4-\d{4}-\d{2}-\d{2}\.json$/);
    expect(file.mimeType).toBe('application/json');

    const parsed = JSON.parse(file.content) as {
      version: number;
      workspaceId: string;
      elements: readonly { readonly id: string; readonly type: string }[];
    };

    expect(parsed.version).toBe(1);
    expect(parsed.workspaceId).toBe('ws-test');
    expect(parsed.elements).toEqual([expect.objectContaining({ id: 'el-1', type: 'text' })]);
    expect(file.content).not.toContain('createdBy');
  });

  it('prints a printable snapshot of the board from the export menu', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const print = jest.fn();
    const originalPrint = window.print;

    window.print = print;

    try {
      renderContainer(getWorkspace, {
        loadWorkspaceElements: createLoadWorkspaceElements({
          status: 'ok',
          elements: [TEXT_ELEMENT],
        }),
        localUserId: 'user-local',
        role: 'viewer',
        fileDownload: { downloadTextFile: jest.fn() },
      });

      await screen.findByTestId('canvas-item-el-1');
      fireEvent.click(await screen.findByRole('button', { name: 'Export board' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as PDF' }));

      await waitFor(() => expect(print).toHaveBeenCalledTimes(1));

      const printView = await screen.findByTestId('board-print-view');
      expect(printView).toHaveTextContent('Roadmap Q4');
      expect(printView).toHaveTextContent('Hello');
    } finally {
      window.print = originalPrint;
    }
  });

  it('does not render the share entry point when no share services are wired', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeInvitationRepository();
    const inviteMember = createInviteMember({
      invitationRepository: repository,
      membershipRepository: new FakeMembershipRepository(),
      generateId: () => InvitationId.create('inv-1'),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      inviteMember,
      listPendingInvitations: createListPendingInvitations(repository),
    });

    await screen.findByRole('application', { name: 'Canvas' });
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('opens the share dialog from the workspace header', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const invitationRepository = new FakeInvitationRepository();
    const membershipRepository = new FakeMembershipRepository();
    await seedMembership(membershipRepository, 'user-local', 'owner');
    let sequence = 0;
    const inviteMember: InviteMember = createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create(`inv-${(sequence += 1)}`),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      inviteMember,
      listPendingInvitations: createListPendingInvitations(invitationRepository),
      listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
      leaveWorkspace: createLeaveWorkspace(membershipRepository),
      changeMemberRole: createChangeMemberRole(membershipRepository),
      removeMember: createRemoveMember(membershipRepository),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('No pending invitations.')).toBeInTheDocument();
  });

  it('returns focus to the Share entry point when the dialog closes', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const invitationRepository = new FakeInvitationRepository();
    const membershipRepository = new FakeMembershipRepository();
    await seedMembership(membershipRepository, 'user-local', 'owner');
    const inviteMember: InviteMember = createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create('inv-1'),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      inviteMember,
      listPendingInvitations: createListPendingInvitations(invitationRepository),
      listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
      leaveWorkspace: createLeaveWorkspace(membershipRepository),
      changeMemberRole: createChangeMemberRole(membershipRepository),
      removeMember: createRemoveMember(membershipRepository),
    });

    const user = userEvent.setup();
    const shareButton = await screen.findByRole('button', { name: 'Share' });
    await user.click(shareButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(shareButton).toHaveFocus();
  });

  it('shows the share entry point to viewers and hides the invite tab', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const invitationRepository = new FakeInvitationRepository();
    const membershipRepository = new FakeMembershipRepository();
    await seedMembership(membershipRepository, 'user-local', 'viewer');
    const inviteMember = createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create('inv-1'),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      inviteMember,
      listPendingInvitations: createListPendingInvitations(invitationRepository),
      listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
      leaveWorkspace: createLeaveWorkspace(membershipRepository),
      role: 'viewer',
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('keeps the invite tab available for an editor', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const invitationRepository = new FakeInvitationRepository();
    const membershipRepository = new FakeMembershipRepository();
    await seedMembership(membershipRepository, 'user-local', 'editor');
    const inviteMember = createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create('inv-1'),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      inviteMember,
      listPendingInvitations: createListPendingInvitations(invitationRepository),
      listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
      leaveWorkspace: createLeaveWorkspace(membershipRepository),
      role: 'editor',
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));

    expect(await screen.findByRole('tab', { name: 'Invite' })).toBeInTheDocument();
  });

  it('renders a read-only canvas for viewers so elements cannot be deleted', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      localUserId: 'user-local',
      role: 'viewer',
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-el-1');
    expect(canvas).toHaveAttribute('aria-readonly', 'true');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(screen.getByTestId('canvas-item-el-1')).toBeInTheDocument();
  });

  it('marks the canvas editable for owners and lets them delete elements', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace, {
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
      localUserId: 'user-local',
      role: 'owner',
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-el-1');
    expect(canvas).toHaveAttribute('aria-readonly', 'false');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());
  });

  it('treats an unknown membership as read-only without the share entry point', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const membershipRepository = new FakeMembershipRepository();

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
      leaveWorkspace: createLeaveWorkspace(membershipRepository),
      role: null,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('aria-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an explicit view-only banner with retry when role resolution fails', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const getWorkspaceRole: GetWorkspaceRole = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 'ok', role: 'editor' });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      getWorkspaceRole,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await waitFor(() => expect(canvas).toHaveAttribute('aria-readonly', 'true'));
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not verify your access/i);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    const retriedCanvas = await screen.findByRole('application', { name: 'Canvas' });
    await waitFor(() => expect(retriedCanvas).toHaveAttribute('aria-readonly', 'false'));
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.queryByText('View only')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the view-only banner when role resolution returns an error result', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const getWorkspaceRole: GetWorkspaceRole = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'offline'),
    });

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      getWorkspaceRole,
    });

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await waitFor(() => expect(canvas).toHaveAttribute('aria-readonly', 'true'));
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not verify your access/i);
  });

  it('creates a text element from the toolbar at the viewport center', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const user = userEvent.setup();

    renderContainer(getWorkspace, { localUserId: 'user-local' });

    await screen.findByRole('application', { name: 'Canvas' });
    await user.click(screen.getByRole('button', { name: 'Add text' }));

    const created = await screen.findByTestId('canvas-item-generated-1');
    expect(created).toHaveAttribute('data-element-type', 'text');
    expect(created).toHaveStyle({
      left: '320px',
      top: '280px',
      width: '160px',
      height: '40px',
    });
  });

  it('persists a created element and restores the board when undoing it', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const user = userEvent.setup();

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      elementPersistenceOrchestrator: orchestrator,
    });

    await screen.findByRole('application', { name: 'Canvas' });
    await user.click(screen.getByRole('button', { name: 'Add text' }));

    await waitFor(async () => {
      const stored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(stored).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(async () => {
      const stored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(stored).toHaveLength(0);
    });
  });

  it('edits an element inline and persists the new content', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const repository = new FakeElementRepository();
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const user = userEvent.setup();

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      elementPersistenceOrchestrator: orchestrator,
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT],
      }),
    });

    const item = await screen.findByTestId('canvas-item-el-1');
    fireEvent.doubleClick(item);

    const editor = await screen.findByTestId('element-editor');
    await user.clear(editor);
    await user.type(editor, 'Updated');
    await user.tab();

    await waitFor(async () => {
      const stored = await repository.listByWorkspace(WorkspaceId.create('ws-test'));
      expect(stored).toHaveLength(1);
      const element = stored[0];
      expect(element?.type).toBe('text');
      if (element?.type === 'text') {
        expect(element.content).toEqual(richTextFromPlain('Updated'));
      }
    });
  });

  it('creates a connector between two selected elements', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const second = createTextElement({
      id: ElementId.create('el-2'),
      workspaceId: WorkspaceId.create('ws-test'),
      createdBy: UserId.create('user-1'),
      position: Position.create(200, 200),
      size: Size.create(120, 80),
      content: 'Second',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const user = userEvent.setup();

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      selectionStore: createSelectionStore(['el-1', 'el-2']),
      loadWorkspaceElements: createLoadWorkspaceElements({
        status: 'ok',
        elements: [TEXT_ELEMENT, second],
      }),
    });

    await screen.findByTestId('canvas-item-el-1');
    await screen.findByTestId('canvas-item-el-2');
    await user.click(screen.getByRole('button', { name: 'Connect selected elements' }));

    const connector = await screen.findByTestId('canvas-item-generated-1');
    expect(connector).toHaveAttribute('data-element-type', 'connector');
    expect(connector).toHaveStyle({
      left: '136.75px',
      top: '124px',
      width: '76.5px',
      height: '72px',
    });
  });

  it('disables element creation without a signed-in user', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace);

    await screen.findByRole('application', { name: 'Canvas' });
    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
  });

  it('does not offer inline renaming to workspace owners', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });

    renderContainer(getWorkspace, {
      role: 'owner',
      localUserId: 'user-1',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Workspace name' })).not.toBeInTheDocument();
  });
});

describe('free connector creation', () => {
  it('creates a standalone connector from the toolbar and selects it', async () => {
    const getWorkspace = createGetWorkspace({ status: 'ok', workspace: WORKSPACE });
    const user = userEvent.setup();

    renderContainer(getWorkspace, {
      localUserId: 'user-local',
      loadWorkspaceElements: createLoadWorkspaceElements({ status: 'ok', elements: [] }),
    });

    await screen.findByRole('application', { name: 'Canvas' });
    await user.click(screen.getByRole('button', { name: 'Add connector' }));

    const connector = await screen.findByTestId('canvas-item-generated-1');

    expect(connector).toHaveAttribute('data-element-type', 'connector');
    expect(connector.querySelector('[data-connector-line]')).not.toBeNull();
    expect(document.querySelector('[data-connector-endpoint]')).not.toBeNull();
  });
});
