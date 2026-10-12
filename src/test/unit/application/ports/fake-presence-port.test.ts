import { Presence } from '../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { describePresencePortContract } from '../../../contract/presence-port-contract';
import { FakePresencePort } from '../../../fixtures/fake-presence-port';

describePresencePortContract('FakePresencePort', () => {
  const fake = new FakePresencePort();
  return {
    port: fake,
    emit: (event) => fake.emit(event),
    emitError: (workspaceId, error) => fake.emitError(workspaceId, error),
    emitConnectionChange: (workspaceId, status) => fake.emitConnectionChange(workspaceId, status),
    activeSubscriptionCount: (workspaceId) => fake.activeSubscriptionCount(workspaceId),
  };
});

describe('FakePresencePort', () => {
  const WORKSPACE_ID = WorkspaceId.create('ws-1');
  const USER_ID = UserId.create('user-1');

  function buildPresence(
    userId: UserId = USER_ID,
    lastSeenAt: Date = new Date('2024-01-01T00:00:00.000Z'),
  ): Presence {
    return Presence.create({ userId, workspaceId: WORKSPACE_ID, lastSeenAt });
  }

  it('announces a joined change then an updated change for the same user', async () => {
    const fake = new FakePresencePort();
    const listener = jest.fn();
    fake.subscribe(WORKSPACE_ID, listener);

    await fake.announce(buildPresence());
    await fake.announce(buildPresence(USER_ID, new Date('2024-01-01T00:00:01.000Z')));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].changes[0].kind).toBe('joined');
    expect(listener.mock.calls[1][0].changes[0].kind).toBe('updated');
  });

  it('withdraws a known presence and emits a left change', async () => {
    const fake = new FakePresencePort();
    const listener = jest.fn();
    fake.subscribe(WORKSPACE_ID, listener);

    await fake.announce(buildPresence());
    listener.mockClear();
    await fake.withdraw(WORKSPACE_ID, USER_ID);

    expect(fake.activePresenceCount(WORKSPACE_ID)).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].changes[0]).toEqual({
      kind: 'left',
      userId: USER_ID,
      origin: 'local',
    });
  });

  it('ignores withdrawing a user who is not present', async () => {
    const fake = new FakePresencePort();
    const listener = jest.fn();
    fake.subscribe(WORKSPACE_ID, listener);

    await fake.withdraw(WORKSPACE_ID, USER_ID);

    expect(listener).not.toHaveBeenCalled();
  });

  it('tracks active presence per workspace', async () => {
    const fake = new FakePresencePort();
    const other = WorkspaceId.create('ws-2');

    await fake.announce(buildPresence());
    await fake.announce(
      Presence.create({
        userId: UserId.create('user-2'),
        workspaceId: other,
        lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    );

    expect(fake.activePresenceCount(WORKSPACE_ID)).toBe(1);
    expect(fake.activePresenceCount(other)).toBe(1);
    expect(fake.presenceOf(WORKSPACE_ID, USER_ID)).toEqual(buildPresence());
  });

  it('does not throw when announcing for a workspace without subscribers', async () => {
    const fake = new FakePresencePort();

    await expect(fake.announce(buildPresence())).resolves.toBeUndefined();
  });
});
