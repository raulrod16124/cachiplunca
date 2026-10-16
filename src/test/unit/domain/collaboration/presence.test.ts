import { Presence } from '../../../../domain/collaboration';
import { Position, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');

describe('Presence', () => {
  it('creates a presence with a default timestamp', () => {
    const before = Date.now();
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID });
    const after = Date.now();

    expect(presence.userId).toBe(USER_ID);
    expect(presence.workspaceId).toBe(WORKSPACE_ID);
    expect(presence.lastSeenAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(presence.lastSeenAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('creates a presence with an explicit timestamp', () => {
    const lastSeenAt = new Date('2024-01-02T00:00:00.000Z');
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt });

    expect(presence.lastSeenAt).toBe(lastSeenAt);
  });

  it('rejects an invalid timestamp', () => {
    expect(() =>
      Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt: new Date('nope') }),
    ).toThrow('Presence timestamp must be a valid Date');
  });

  it('refresh returns a new instance and leaves the original untouched', () => {
    const original = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const refreshed = original.refresh(new Date('2024-01-01T00:00:05.000Z'));

    expect(refreshed).not.toBe(original);
    expect(refreshed.userId).toBe(original.userId);
    expect(refreshed.workspaceId).toBe(original.workspaceId);
    expect(original.lastSeenAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(refreshed.lastSeenAt.toISOString()).toBe('2024-01-01T00:00:05.000Z');
  });

  it('refresh rejects an invalid timestamp', () => {
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID });

    expect(() => presence.refresh(new Date('nope'))).toThrow(
      'Presence timestamp must be a valid Date',
    );
  });

  it('reports whether it belongs to a workspace', () => {
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID });

    expect(presence.isFor(WORKSPACE_ID)).toBe(true);
    expect(presence.isFor(OTHER_WORKSPACE_ID)).toBe(false);
  });

  it('compares by value', () => {
    const lastSeenAt = new Date('2024-01-01T00:00:00.000Z');
    const a = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt });
    const b = Presence.create({
      userId: UserId.create('user-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      lastSeenAt,
    });
    const other = Presence.create({
      userId: UserId.create('user-2'),
      workspaceId: WORKSPACE_ID,
      lastSeenAt,
    });

    expect(a.equals(b)).toBe(true);
    expect(a.equals(other)).toBe(false);
  });

  it('serializes to a stable JSON shape', () => {
    const presence = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(presence.toJSON()).toEqual({
      userId: 'user-1',
      workspaceId: 'ws-1',
      lastSeenAt: '2024-01-01T00:00:00.000Z',
      cursor: null,
    });
  });

  it('creates a presence without a cursor by default', () => {
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID });

    expect(presence.cursor).toBeNull();
  });

  it('creates a presence with an explicit cursor', () => {
    const cursor = Position.create(12, -4);
    const presence = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, cursor });

    expect(presence.cursor).toBe(cursor);
  });

  it('moveCursor returns a new instance carrying the cursor and leaves the original untouched', () => {
    const original = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const moved = original.moveCursor(Position.create(5, 6));

    expect(moved).not.toBe(original);
    expect(original.cursor).toBeNull();
    expect(moved.userId).toBe(original.userId);
    expect(moved.workspaceId).toBe(original.workspaceId);
    expect(moved.cursor?.toJSON()).toEqual({ x: 5, y: 6 });
  });

  it('moveCursor is a no-op reference when the cursor does not change', () => {
    const cursor = Position.create(5, 6);
    const presence = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      cursor,
    });

    expect(presence.moveCursor(Position.create(5, 6))).toBe(presence);
  });

  it('refresh keeps the cursor of the original presence', () => {
    const cursor = Position.create(5, 6);
    const presence = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
      cursor,
    });

    const refreshed = presence.refresh(new Date('2024-01-01T00:00:05.000Z'));

    expect(refreshed.cursor).toBe(cursor);
  });

  it('compares cursors by value', () => {
    const lastSeenAt = new Date('2024-01-01T00:00:00.000Z');
    const a = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt,
      cursor: Position.create(1, 2),
    });
    const same = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt,
      cursor: Position.create(1, 2),
    });
    const different = Presence.create({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      lastSeenAt,
      cursor: Position.create(3, 4),
    });
    const none = Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt });

    expect(a.equals(same)).toBe(true);
    expect(a.equals(different)).toBe(false);
    expect(a.equals(none)).toBe(false);
    expect(
      none.equals(Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt })),
    ).toBe(true);
  });
});
