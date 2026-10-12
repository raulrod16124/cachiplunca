import { Presence } from '../../../../domain/collaboration';
import { Position, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromPresenceDocument,
  toPresenceDocument,
  type PresenceDocument,
} from '../../../../infrastructure/firebase/firebase-presence-mapper';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');
const LAST_SEEN_AT = new Date('2024-01-02T00:00:00.000Z');

function buildPresence(): Presence {
  return Presence.create({ userId: USER_ID, workspaceId: WORKSPACE_ID, lastSeenAt: LAST_SEEN_AT });
}

function asRecord(document: PresenceDocument): Record<string, unknown> {
  return document as unknown as Record<string, unknown>;
}

describe('toPresenceDocument', () => {
  it('maps a Presence to a plain document', () => {
    const document = toPresenceDocument(buildPresence());

    expect(document.workspaceId).toBe('ws-1');
    expect(document.userId).toBe('user-1');
    expect(document.lastSeenAt).toEqual(LAST_SEEN_AT);
  });

  it('round-trips through fromPresenceDocument', () => {
    const presence = buildPresence();

    expect(fromPresenceDocument(toPresenceDocument(presence))).toEqual(presence);
  });

  it('omits the cursor field when there is no cursor', () => {
    const document = toPresenceDocument(buildPresence());

    expect(document.cursor).toBeUndefined();
  });

  it('maps a cursor position when present and round-trips it', () => {
    const presence = buildPresence().moveCursor(Position.create(12.5, -4));
    const document = toPresenceDocument(presence);

    expect(document.cursor).toEqual({ x: 12.5, y: -4 });
    expect(fromPresenceDocument(document).cursor?.toJSON()).toEqual({ x: 12.5, y: -4 });
  });
});

describe('fromPresenceDocument', () => {
  it('reads a document with a Date timestamp', () => {
    const presence = fromPresenceDocument({
      workspaceId: 'ws-1',
      userId: 'user-1',
      lastSeenAt: LAST_SEEN_AT,
    });

    expect(presence).toEqual(buildPresence());
  });

  it('reads a document with a Firestore Timestamp', () => {
    const presence = fromPresenceDocument({
      workspaceId: 'ws-1',
      userId: 'user-1',
      lastSeenAt: { toDate: () => LAST_SEEN_AT },
    });

    expect(presence).toEqual(buildPresence());
  });

  it('rejects a non-object document', () => {
    expect(() => fromPresenceDocument(null)).toThrow('Presence document must be an object');
  });

  it('rejects a missing user id', () => {
    expect(() => fromPresenceDocument({ workspaceId: 'ws-1', lastSeenAt: LAST_SEEN_AT })).toThrow(
      'Presence document field "userId" must be a string',
    );
  });

  it('rejects a missing workspace id', () => {
    expect(() => fromPresenceDocument({ userId: 'user-1', lastSeenAt: LAST_SEEN_AT })).toThrow(
      'Presence document field "workspaceId" must be a string',
    );
  });

  it('rejects an unsupported timestamp value', () => {
    expect(() =>
      fromPresenceDocument({ workspaceId: 'ws-1', userId: 'user-1', lastSeenAt: 'yesterday' }),
    ).toThrow('Presence document field "lastSeenAt" must be a Date or Timestamp');
  });

  it('rejects an invalid timestamp', () => {
    expect(() =>
      fromPresenceDocument({
        workspaceId: 'ws-1',
        userId: 'user-1',
        lastSeenAt: new Date('nope'),
      }),
    ).toThrow('Presence document field "lastSeenAt" must be a valid Date');
  });

  it('rejects an empty user id through the value object validation', () => {
    const document = { ...asRecord(toPresenceDocument(buildPresence())), userId: '   ' };

    expect(() => fromPresenceDocument(document)).toThrow('UserId cannot be empty');
  });

  it('reads a document without a cursor as a null cursor', () => {
    const presence = fromPresenceDocument({
      workspaceId: 'ws-1',
      userId: 'user-1',
      lastSeenAt: LAST_SEEN_AT,
    });

    expect(presence.cursor).toBeNull();
  });

  it('rejects a cursor that is not an object', () => {
    expect(() =>
      fromPresenceDocument({
        workspaceId: 'ws-1',
        userId: 'user-1',
        lastSeenAt: LAST_SEEN_AT,
        cursor: 'somewhere',
      }),
    ).toThrow('Presence document field "cursor" must be an object');
  });

  it('rejects a cursor with non-numeric coordinates', () => {
    expect(() =>
      fromPresenceDocument({
        workspaceId: 'ws-1',
        userId: 'user-1',
        lastSeenAt: LAST_SEEN_AT,
        cursor: { x: '1', y: 2 },
      }),
    ).toThrow('Presence document field "cursor.x" must be a number');
  });
});
