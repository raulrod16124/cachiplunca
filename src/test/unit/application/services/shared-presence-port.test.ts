import { createSharedPresencePort } from '../../../../application/services';
import { Presence } from '../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakePresencePort } from '../../../fixtures/fake-presence-port';

const WORKSPACE_ID = WorkspaceId.create('ws-1');

function presenceOf(userId: string): Presence {
  return Presence.create({ userId: UserId.create(userId), workspaceId: WORKSPACE_ID });
}

describe('createSharedPresencePort', () => {
  it('opens a single underlying subscription for multiple consumers', () => {
    const port = new FakePresencePort();
    const shared = createSharedPresencePort(port);

    const unsubscribeA = shared.subscribe(WORKSPACE_ID, jest.fn());
    const unsubscribeB = shared.subscribe(WORKSPACE_ID, jest.fn());

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    unsubscribeA();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    unsubscribeB();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('fans events out to every consumer', () => {
    const port = new FakePresencePort();
    const shared = createSharedPresencePort(port);
    const listenerA = jest.fn();
    const listenerB = jest.fn();

    shared.subscribe(WORKSPACE_ID, listenerA);
    shared.subscribe(WORKSPACE_ID, listenerB);

    const change = {
      kind: 'joined' as const,
      presence: presenceOf('user-1'),
      origin: 'remote' as const,
    };
    port.emitChanges(WORKSPACE_ID, [change]);

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('fans errors out to every consumer', () => {
    const port = new FakePresencePort();
    const shared = createSharedPresencePort(port);
    const errorA = jest.fn();
    const errorB = jest.fn();

    shared.subscribe(WORKSPACE_ID, jest.fn(), errorA);
    shared.subscribe(WORKSPACE_ID, jest.fn(), errorB);

    const error = createAppError(
      'collaboration',
      ERROR_CODES.COLLABORATION_SYNC_FAILED,
      'Presence channel failed.',
    );
    port.emitError(WORKSPACE_ID, error);

    expect(errorA).toHaveBeenCalledWith(error);
    expect(errorB).toHaveBeenCalledWith(error);
  });

  it('passes writes through to the underlying port', async () => {
    const port = new FakePresencePort();
    const shared = createSharedPresencePort(port);
    const presence = presenceOf('user-1');

    await shared.announce(presence);
    expect(port.presenceOf(WORKSPACE_ID, presence.userId)).toBeDefined();

    await shared.withdraw(WORKSPACE_ID, presence.userId);
    expect(port.presenceOf(WORKSPACE_ID, presence.userId)).toBeUndefined();
  });

  it('treats unsubscribe as idempotent', () => {
    const port = new FakePresencePort();
    const shared = createSharedPresencePort(port);

    const unsubscribe = shared.subscribe(WORKSPACE_ID, jest.fn());
    unsubscribe();
    unsubscribe();

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });
});
