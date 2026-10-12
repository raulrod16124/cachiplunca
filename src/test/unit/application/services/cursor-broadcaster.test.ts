import {
  createCursorBroadcaster,
  DEFAULT_CURSOR_THROTTLE_MS,
} from '../../../../application/services/cursor-broadcaster';
import { Presence } from '../../../../domain/collaboration';
import { Position, UserId, WorkspaceId } from '../../../../domain/shared';
import { FakePresencePort } from '../../../fixtures/fake-presence-port';
import { flushMicrotasks, ManualScheduler } from '../../../fixtures/manual-scheduler';

const BASE_PRESENCE = Presence.create({
  userId: UserId.create('user-1'),
  workspaceId: WorkspaceId.create('ws-1'),
});

describe('DEFAULT_CURSOR_THROTTLE_MS', () => {
  it('is a small positive interval', () => {
    expect(DEFAULT_CURSOR_THROTTLE_MS).toBe(80);
  });
});

describe('createCursorBroadcaster', () => {
  it('sends the first move immediately (leading edge)', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const scheduler = new ManualScheduler();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler,
    });

    broadcaster.move(Position.create(1, 2));
    await flushMicrotasks();

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0]?.[0].cursor?.toJSON()).toEqual({ x: 1, y: 2 });
    expect(scheduler.pending).toBe(1);
  });

  it('coalesces rapid moves into a single trailing send', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const scheduler = new ManualScheduler();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler,
    });

    broadcaster.move(Position.create(1, 1));
    await flushMicrotasks();
    broadcaster.move(Position.create(2, 2));
    broadcaster.move(Position.create(3, 3));
    scheduler.run();
    await flushMicrotasks();

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce.mock.calls[1]?.[0].cursor?.toJSON()).toEqual({ x: 3, y: 3 });
  });

  it('ignores a move equal to the last requested position', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const scheduler = new ManualScheduler();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler,
    });

    broadcaster.move(Position.create(1, 1));
    await flushMicrotasks();
    scheduler.run();
    await flushMicrotasks();
    broadcaster.move(Position.create(1, 1));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(scheduler.pending).toBe(0);
  });

  it('flush sends the latest pending cursor immediately and cancels the trailing task', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const scheduler = new ManualScheduler();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler,
    });

    broadcaster.move(Position.create(1, 1));
    await flushMicrotasks();
    broadcaster.move(Position.create(5, 5));
    await broadcaster.flush();

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce.mock.calls[1]?.[0].cursor?.toJSON()).toEqual({ x: 5, y: 5 });
    expect(scheduler.pending).toBe(0);
  });

  it('flush is a no-op when there is nothing pending', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler: new ManualScheduler(),
    });

    await broadcaster.flush();
    expect(announce).not.toHaveBeenCalled();
  });

  it('routes announce failures to onError', async () => {
    const port = new FakePresencePort();
    jest.spyOn(port, 'announce').mockRejectedValue(new Error('boom'));
    const onError = jest.fn();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      onError,
      scheduler: new ManualScheduler(),
    });

    broadcaster.move(Position.create(1, 1));
    await flushMicrotasks();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ message: 'boom' });
  });

  it('stop cancels the trailing send and ignores further moves', async () => {
    const port = new FakePresencePort();
    const announce = jest.spyOn(port, 'announce');
    const scheduler = new ManualScheduler();
    const broadcaster = createCursorBroadcaster({
      presencePort: port,
      basePresence: BASE_PRESENCE,
      scheduler,
    });

    broadcaster.move(Position.create(1, 1));
    await flushMicrotasks();
    broadcaster.move(Position.create(2, 2));
    broadcaster.stop();

    expect(scheduler.pending).toBe(0);

    broadcaster.move(Position.create(3, 3));
    scheduler.run();
    await flushMicrotasks();

    expect(announce).toHaveBeenCalledTimes(1);
  });
});
