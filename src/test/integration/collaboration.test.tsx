import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ElementRealtimeChange } from '../../application/ports';
import { Presence } from '../../domain/collaboration';
import type { TaskElement } from '../../domain/element';
import { createTaskElement, createTextElement, withTaskTitle } from '../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { ERROR_CODES, createAppError } from '../../shared/errors';
import type { AppHarness } from './harness';
import { createAppHarness } from './harness';

interface OpenBoard {
  readonly harness: AppHarness;
  readonly workspace: Workspace;
  readonly view: RenderResult;
  readonly localUserId: string;
}

function boardItems(): HTMLElement[] {
  return screen.queryAllByTestId(/^canvas-item-/);
}

async function openBoard(name: string): Promise<OpenBoard> {
  const harness = createAppHarness();
  const owner = await harness.register();
  const workspace = await harness.createOwnerWorkspace(name);
  const view = harness.render({ initialPath: `/workspaces/${workspace.id.value}` });

  expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
  await waitFor(() => expect(harness.realtimePort.activeSubscriptionCount(workspace.id)).toBe(1));

  return { harness, workspace, view, localUserId: owner.uid };
}

function emitRemoteChanges(
  harness: AppHarness,
  workspaceId: WorkspaceId,
  changes: readonly ElementRealtimeChange[],
): Promise<void> {
  return act(async () => {
    harness.realtimePort.emit({ workspaceId, changes });
  });
}

function remoteTask(
  workspaceId: WorkspaceId,
  id: string,
  position: { x: number; y: number },
  title: string,
  updatedAt: Date,
): TaskElement {
  return createTaskElement({
    id: ElementId.create(id),
    workspaceId,
    createdBy: UserId.create('teammate-1'),
    position: Position.create(position.x, position.y),
    size: Size.create(160, 80),
    title,
    status: 'todo',
    createdAt: updatedAt,
    updatedAt,
  });
}

function teammatePresence(
  workspaceId: WorkspaceId,
  userId: string,
  cursor: { x: number; y: number } | null,
): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId,
    cursor: cursor === null ? null : Position.create(cursor.x, cursor.y),
  });
}

describe('collaboration', () => {
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

  it('applies remote additions, updates and removals without persisting them locally', async () => {
    const { harness, workspace } = await openBoard('Realtime ops');
    expect(boardItems()).toHaveLength(0);

    const created = remoteTask(
      workspace.id,
      'remote-task',
      { x: 40, y: 40 },
      'Draft spec',
      new Date('2026-01-01T10:00:00.000Z'),
    );
    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'added', element: created, origin: 'remote' },
    ]);
    await waitFor(() => expect(boardItems()).toHaveLength(1));
    expect(screen.getByTestId('canvas-item-remote-task')).toHaveAttribute(
      'aria-label',
      'Task: Draft spec, to do',
    );

    const updated = withTaskTitle(created, 'Final spec', new Date('2026-01-01T11:00:00.000Z'));
    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'modified', element: updated, origin: 'remote' },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-remote-task')).toHaveAttribute(
        'aria-label',
        'Task: Final spec, to do',
      ),
    );
    expect(boardItems()).toHaveLength(1);

    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'removed', elementId: created.id, origin: 'remote' },
    ]);
    await waitFor(() => expect(boardItems()).toHaveLength(0));

    expect(await harness.elementRepository.listByWorkspace(workspace.id)).toHaveLength(0);
  });

  it('keeps the newest version when local and remote edits collide', async () => {
    const { harness, workspace } = await openBoard('Conflict board');

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Local task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    const [local] = await harness.elementRepository.listByWorkspace(workspace.id);
    expect(local).toBeDefined();

    const stale = createTaskElement({
      id: local.id,
      workspaceId: workspace.id,
      createdBy: UserId.create('teammate-1'),
      position: local.position,
      size: local.size,
      title: 'Stale remote title',
      status: 'todo',
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
      updatedAt: new Date('2000-01-01T00:00:00.000Z'),
    });
    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'modified', element: stale, origin: 'remote' },
    ]);
    expect(screen.queryByLabelText('Task: Stale remote title, to do')).not.toBeInTheDocument();
    expect(boardItems()).toHaveLength(1);

    const winner = createTaskElement({
      id: local.id,
      workspaceId: workspace.id,
      createdBy: UserId.create('teammate-1'),
      position: local.position,
      size: local.size,
      title: 'Newest remote title',
      status: 'todo',
      createdAt: new Date('2999-01-01T00:00:00.000Z'),
      updatedAt: new Date('2999-01-01T00:00:00.000Z'),
    });
    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'modified', element: winner, origin: 'remote' },
    ]);
    await waitFor(() =>
      expect(screen.getByLabelText('Task: Newest remote title, to do')).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Task: Stale remote title, to do')).not.toBeInTheDocument();
  });

  it('surfaces collaboration errors and clears them across a reconnect', async () => {
    const { harness, workspace } = await openBoard('Reconnect board');

    await act(async () => {
      harness.realtimePort.emitError(
        workspace.id,
        createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'offline'),
      );
    });
    expect(
      await screen.findByText(
        'Live collaboration is offline. Changes from other people may not appear.',
      ),
    ).toBeInTheDocument();

    await act(async () => {
      harness.realtimePort.emitConnectionChange(workspace.id, 'reconnecting');
    });
    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument();

    await act(async () => {
      harness.realtimePort.emitConnectionChange(workspace.id, 'connected');
    });
    await waitFor(() => expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument());
    expect(
      screen.queryByText(
        'Live collaboration is offline. Changes from other people may not appear.',
      ),
    ).not.toBeInTheDocument();
  });

  it('shows remote teammates and their cursors, excluding the local user', async () => {
    const { harness, workspace, localUserId } = await openBoard('Presence board');

    expect(screen.queryByTestId('connected-users')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remote-cursors-overlay')).not.toBeInTheDocument();

    await act(async () => {
      harness.presencePort.emitChanges(workspace.id, [
        {
          kind: 'joined',
          presence: teammatePresence(workspace.id, localUserId, { x: 10, y: 10 }),
          origin: 'local',
        },
        {
          kind: 'joined',
          presence: teammatePresence(workspace.id, 'teammate-1', { x: 120, y: 90 }),
          origin: 'remote',
        },
      ]);
    });

    const connected = await screen.findByTestId('connected-users');
    expect(connected).toHaveTextContent('1 connected');

    const cursor = await screen.findByTestId('remote-cursor');
    expect(cursor).toHaveAttribute('data-user-id', 'teammate-1');

    await act(async () => {
      harness.presencePort.emitChanges(workspace.id, [
        { kind: 'left', userId: UserId.create('teammate-1'), origin: 'remote' },
      ]);
    });
    await waitFor(() => expect(screen.queryByTestId('connected-users')).not.toBeInTheDocument());
    expect(screen.queryByTestId('remote-cursors-overlay')).not.toBeInTheDocument();
  });

  it('ignores foreign and local-origin realtime events and keeps a single subscription', async () => {
    const { harness, workspace, view } = await openBoard('Isolated board');

    expect(harness.realtimePort.activeSubscriptionCount()).toBe(1);
    expect(harness.presencePort.activeSubscriptionCount(workspace.id)).toBe(1);

    const text = createTextElement({
      id: ElementId.create('remote-text'),
      workspaceId: workspace.id,
      createdBy: UserId.create('teammate-1'),
      position: Position.create(40, 40),
      size: Size.create(160, 40),
      content: 'local echo',
    });
    await emitRemoteChanges(harness, workspace.id, [
      { kind: 'added', element: text, origin: 'local' },
    ]);
    expect(boardItems()).toHaveLength(0);

    const foreign = remoteTask(
      WorkspaceId.create('other-workspace'),
      'remote-foreign',
      { x: 40, y: 40 },
      'Foreign',
      new Date('2026-01-01T10:00:00.000Z'),
    );
    await emitRemoteChanges(harness, WorkspaceId.create('other-workspace'), [
      { kind: 'added', element: foreign, origin: 'remote' },
    ]);
    expect(boardItems()).toHaveLength(0);
    expect(
      harness.realtimePort.activeSubscriptionCount(WorkspaceId.create('other-workspace')),
    ).toBe(0);

    view.unmount();
    await waitFor(() => expect(harness.realtimePort.activeSubscriptionCount()).toBe(0));
    await waitFor(() => expect(harness.presencePort.activeSubscriptionCount()).toBe(0));
  });
});
