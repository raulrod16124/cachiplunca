import {
  createRealtimeSubscriptionManager,
  type RealtimeSubscriptionManager,
} from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeRealtimePort } from '../../../fixtures/fake-realtime-port';
import type { ElementRealtimeEvent } from '../../../../application/ports';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');

function buildElement(id: string, workspaceId: WorkspaceId = WORKSPACE_ID): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    content: 'Hello',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });
}

function addedEvent(workspaceId: WorkspaceId, id: string): ElementRealtimeEvent {
  return {
    workspaceId,
    changes: [{ kind: 'added', element: buildElement(id, workspaceId), origin: 'remote' }],
  };
}

const syncError = createAppError(
  'collaboration',
  ERROR_CODES.COLLABORATION_SYNC_FAILED,
  'Sync failed.',
);

describe('createRealtimeSubscriptionManager', () => {
  let port: FakeRealtimePort;
  let manager: RealtimeSubscriptionManager;

  beforeEach(() => {
    port = new FakeRealtimePort();
    manager = createRealtimeSubscriptionManager(port);
  });

  it('delivers events to a single consumer', () => {
    const listener = jest.fn();
    manager.subscribe(WORKSPACE_ID, listener);

    const event = addedEvent(WORKSPACE_ID, 'el-1');
    port.emit(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it('opens a single port subscription for multiple consumers of a workspace', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn());
    manager.subscribe(WORKSPACE_ID, jest.fn());
    manager.subscribe(WORKSPACE_ID, jest.fn());

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);
  });

  it('fans out each event to every consumer of a workspace', () => {
    const first = jest.fn();
    const second = jest.fn();
    manager.subscribe(WORKSPACE_ID, first);
    manager.subscribe(WORKSPACE_ID, second);

    const event = addedEvent(WORKSPACE_ID, 'el-1');
    port.emit(event);

    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
  });

  it('keeps one port subscription per workspace', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn());
    manager.subscribe(OTHER_WORKSPACE_ID, jest.fn());

    expect(port.activeSubscriptionCount()).toBe(2);
  });

  it('closes the port subscription only after the last consumer unsubscribes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = manager.subscribe(WORKSPACE_ID, first);
    manager.subscribe(WORKSPACE_ID, second);

    unsubscribeFirst();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    const event = addedEvent(WORKSPACE_ID, 'el-1');
    port.emit(event);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(event);

    manager.dispose();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('stops delivering to a consumer after it unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = manager.subscribe(WORKSPACE_ID, listener);

    unsubscribe();
    port.emit(addedEvent(WORKSPACE_ID, 'el-1'));

    expect(listener).not.toHaveBeenCalled();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('reopens the port subscription when a workspace is re-subscribed', () => {
    const unsubscribe = manager.subscribe(WORKSPACE_ID, jest.fn());
    unsubscribe();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);

    manager.subscribe(WORKSPACE_ID, jest.fn());
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);
  });

  it('treats unsubscribe as idempotent', () => {
    const unsubscribe = manager.subscribe(WORKSPACE_ID, jest.fn());

    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('does not break other consumers when one unsubscribes during fan-out', () => {
    const stable = jest.fn();
    let unsubscribeSelf: () => void = () => {};
    const self = jest.fn(() => unsubscribeSelf());

    manager.subscribe(WORKSPACE_ID, stable);
    unsubscribeSelf = manager.subscribe(WORKSPACE_ID, self);

    const event = addedEvent(WORKSPACE_ID, 'el-1');
    expect(() => port.emit(event)).not.toThrow();

    expect(stable).toHaveBeenCalledWith(event);
    expect(self).toHaveBeenCalledWith(event);
  });

  it('fans errors out to registered error listeners', () => {
    const onError = jest.fn();
    manager.subscribe(WORKSPACE_ID, jest.fn(), onError);

    port.emitError(WORKSPACE_ID, syncError);

    expect(onError).toHaveBeenCalledWith(syncError);
  });

  it('does not throw when an error arrives with no error listener', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn());

    expect(() => port.emitError(WORKSPACE_ID, syncError)).not.toThrow();
  });

  it('fans connection status changes out to registered listeners', () => {
    const first = jest.fn();
    const second = jest.fn();
    manager.subscribe(WORKSPACE_ID, jest.fn(), undefined, first);
    manager.subscribe(WORKSPACE_ID, jest.fn(), undefined, second);

    port.emitConnectionChange(WORKSPACE_ID, 'reconnecting');

    expect(first).toHaveBeenCalledWith('reconnecting');
    expect(second).toHaveBeenCalledWith('reconnecting');
  });

  it('delivers connection changes to every consumer of a workspace over a single port subscription', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn(), undefined, jest.fn());
    manager.subscribe(WORKSPACE_ID, jest.fn(), undefined, jest.fn());

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    port.emitConnectionChange(WORKSPACE_ID, 'reconnecting');
  });

  it('stops delivering connection changes to a consumer after it unsubscribes', () => {
    const onConnectionChange = jest.fn();
    const unsubscribe = manager.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    unsubscribe();
    port.emitConnectionChange(WORKSPACE_ID, 'reconnecting');

    expect(onConnectionChange).not.toHaveBeenCalled();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('does not throw when a connection change arrives with no listener', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn());

    expect(() => port.emitConnectionChange(WORKSPACE_ID, 'reconnecting')).not.toThrow();
  });

  it('closes every port subscription on dispose', () => {
    manager.subscribe(WORKSPACE_ID, jest.fn());
    manager.subscribe(OTHER_WORKSPACE_ID, jest.fn());
    expect(port.activeSubscriptionCount()).toBe(2);

    manager.dispose();

    expect(port.activeSubscriptionCount()).toBe(0);
  });

  it('stops delivering events after dispose', () => {
    const listener = jest.fn();
    manager.subscribe(WORKSPACE_ID, listener);

    manager.dispose();
    port.emit(addedEvent(WORKSPACE_ID, 'el-1'));

    expect(listener).not.toHaveBeenCalled();
  });
});
