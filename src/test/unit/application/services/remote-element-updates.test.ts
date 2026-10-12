import type { ElementRealtimeEvent } from '../../../../application/ports';
import { applyRemoteElementChanges } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');

function buildElement(
  id: string,
  overrides: {
    readonly workspaceId?: WorkspaceId;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly position?: Position;
  } = {},
): Element {
  const createdAt = overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z');
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
    createdBy: USER_ID,
    position: overrides.position ?? Position.create(10, 20),
    size: Size.create(120, 80),
    content: 'Hello',
    createdAt,
    updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00.000Z'),
  });
}

function added(
  element: Element,
  workspaceId: WorkspaceId = WORKSPACE_ID,
  origin: 'local' | 'remote' = 'remote',
): ElementRealtimeEvent {
  return { workspaceId, changes: [{ kind: 'added', element, origin }] };
}

describe('applyRemoteElementChanges', () => {
  const base = new Date('2024-01-02T00:00:00.000Z');

  it('adds new remote elements to the board', () => {
    const element = buildElement('el-1');

    const next = applyRemoteElementChanges([], added(element));

    expect(next).toEqual([element]);
  });

  it('replaces an existing element when the remote version is newer', () => {
    const current = buildElement('el-1', { updatedAt: base });
    const remote = buildElement('el-1', {
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      position: Position.create(50, 60),
    });

    const next = applyRemoteElementChanges([current], added(remote));

    expect(next).toHaveLength(1);
    expect(next[0].position.equals(Position.create(50, 60))).toBe(true);
    expect(next[0].updatedAt).toEqual(new Date('2024-01-03T00:00:00.000Z'));
  });

  it('ignores a remote version that is not strictly newer', () => {
    const current = buildElement('el-1', { updatedAt: base });
    const board = [current];
    const remote = buildElement('el-1', { updatedAt: new Date('2024-01-01T00:00:00.000Z') });

    const next = applyRemoteElementChanges(board, added(remote));

    expect(next).toBe(board);
    expect(next[0]).toBe(current);
  });

  it('removes an element when the remote deletes it', () => {
    const element = buildElement('el-1');
    const event: ElementRealtimeEvent = {
      workspaceId: WORKSPACE_ID,
      changes: [{ kind: 'removed', elementId: ElementId.create('el-1'), origin: 'remote' }],
    };

    const next = applyRemoteElementChanges([element], event);

    expect(next).toEqual([]);
  });

  it('keeps elements that are not removed', () => {
    const kept = buildElement('kept');
    const removedElement = buildElement('removed');
    const event: ElementRealtimeEvent = {
      workspaceId: WORKSPACE_ID,
      changes: [{ kind: 'removed', elementId: ElementId.create('removed'), origin: 'remote' }],
    };

    const next = applyRemoteElementChanges([kept, removedElement], event);

    expect(next).toEqual([kept]);
  });

  it('ignores local-origin echoes', () => {
    const board: readonly Element[] = [];
    const element = buildElement('el-1');

    const next = applyRemoteElementChanges(board, added(element, WORKSPACE_ID, 'local'));

    expect(next).toBe(board);
  });

  it('ignores changes from other workspaces', () => {
    const board: readonly Element[] = [];
    const element = buildElement('el-1', { workspaceId: OTHER_WORKSPACE_ID });

    const next = applyRemoteElementChanges(board, added(element, WORKSPACE_ID));

    expect(next).toBe(board);
  });

  it('applies only the remote changes from a mixed event', () => {
    const remote = buildElement('el-1');
    const event: ElementRealtimeEvent = {
      workspaceId: WORKSPACE_ID,
      changes: [
        { kind: 'added', element: buildElement('local-echo'), origin: 'local' },
        { kind: 'added', element: remote, origin: 'remote' },
        { kind: 'removed', elementId: ElementId.create('missing'), origin: 'local' },
      ],
    };

    const next = applyRemoteElementChanges([], event);

    expect(next).toEqual([remote]);
  });

  it('returns the same board reference when no remote change applies', () => {
    const board = [buildElement('el-1')];

    const unchanged = applyRemoteElementChanges(board, {
      workspaceId: WORKSPACE_ID,
      changes: [{ kind: 'removed', elementId: ElementId.create('missing'), origin: 'remote' }],
    });

    expect(unchanged).toBe(board);
  });

  it('dedupes repeated adds for the same id keeping the last one', () => {
    const first = buildElement('el-1', { updatedAt: new Date('2024-01-02T00:00:00.000Z') });
    const second = buildElement('el-1', { updatedAt: new Date('2024-01-03T00:00:00.000Z') });
    const event: ElementRealtimeEvent = {
      workspaceId: WORKSPACE_ID,
      changes: [
        { kind: 'added', element: first, origin: 'remote' },
        { kind: 'added', element: second, origin: 'remote' },
      ],
    };

    const next = applyRemoteElementChanges([], event);

    expect(next).toEqual([second]);
  });

  it('sorts elements by createdAt after applying changes', () => {
    const older = buildElement('el-1', {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });
    const newer = buildElement('el-2', {
      createdAt: new Date('2024-01-05T00:00:00.000Z'),
      updatedAt: new Date('2024-01-06T00:00:00.000Z'),
    });

    const next = applyRemoteElementChanges([], {
      workspaceId: WORKSPACE_ID,
      changes: [
        { kind: 'added', element: newer, origin: 'remote' },
        { kind: 'added', element: older, origin: 'remote' },
      ],
    });

    expect(next.map((element) => element.id.value)).toEqual(['el-1', 'el-2']);
  });

  it('converges the same way for a same-timestamp conflict regardless of arrival order', () => {
    const timestamp = new Date('2024-01-02T00:00:00.000Z');
    const local = buildElement('el-1', { position: Position.create(1, 1), updatedAt: timestamp });
    const remote = buildElement('el-1', { position: Position.create(2, 2), updatedAt: timestamp });

    const fromLocal = applyRemoteElementChanges([local], added(remote));
    const fromRemote = applyRemoteElementChanges([remote], added(local));

    expect(fromLocal).toEqual(fromRemote);
  });

  it('applies concurrent remote edits to independent elements in any order', () => {
    const elementA = buildElement('el-a', { updatedAt: new Date('2024-01-03T00:00:00.000Z') });
    const elementB = buildElement('el-b', { updatedAt: new Date('2024-01-04T00:00:00.000Z') });

    const forward = applyRemoteElementChanges([], {
      workspaceId: WORKSPACE_ID,
      changes: [
        { kind: 'added', element: elementA, origin: 'remote' },
        { kind: 'added', element: elementB, origin: 'remote' },
      ],
    });
    const reversed = applyRemoteElementChanges([], {
      workspaceId: WORKSPACE_ID,
      changes: [
        { kind: 'added', element: elementB, origin: 'remote' },
        { kind: 'added', element: elementA, origin: 'remote' },
      ],
    });

    expect(forward).toEqual(reversed);
    expect(forward.map((element) => element.id.value)).toEqual(['el-a', 'el-b']);
  });
});
