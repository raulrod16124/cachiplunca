import type {
  PresenceEvent,
  PresencePort,
  RealtimeConnectionStatus,
} from '../../application/ports';
import { Presence } from '../../domain/collaboration';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';

export interface PresencePortHarness {
  readonly port: PresencePort;
  emit(event: PresenceEvent): void;
  emitError(workspaceId: WorkspaceId, error: AppError): void;
  emitConnectionChange(workspaceId: WorkspaceId, status: RealtimeConnectionStatus): void;
  activeSubscriptionCount(workspaceId?: WorkspaceId): number;
}

type HarnessFactory = () => PresencePortHarness;

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');

function joinedEvent(workspaceId: WorkspaceId, userId: string = USER_ID.value): PresenceEvent {
  return {
    workspaceId,
    changes: [
      {
        kind: 'joined',
        presence: Presence.create({ userId: UserId.create(userId), workspaceId }),
        origin: 'remote',
      },
    ],
  };
}

export function describePresencePortContract(
  suiteName: string,
  createHarness: HarnessFactory,
): void {
  describe(suiteName, () => {
    let harness: PresencePortHarness;

    beforeEach(() => {
      harness = createHarness();
    });

    it('delivers emitted events to a subscriber', () => {
      const listener = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, listener);

      const event = joinedEvent(WORKSPACE_ID);
      harness.emit(event);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('does not deliver events for a different workspace', () => {
      const listener = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, listener);

      harness.emit(joinedEvent(OTHER_WORKSPACE_ID, 'user-other'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops delivering events after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = harness.port.subscribe(WORKSPACE_ID, listener);

      harness.emit(joinedEvent(WORKSPACE_ID));
      unsubscribe();
      harness.emit(joinedEvent(WORKSPACE_ID));

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('treats unsubscribe as idempotent', () => {
      const listener = jest.fn();
      const unsubscribe = harness.port.subscribe(WORKSPACE_ID, listener);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
      expect(harness.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
    });

    it('delivers errors to the onError listener', () => {
      const onError = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, jest.fn(), onError);

      const error = createAppError(
        'collaboration',
        ERROR_CODES.COLLABORATION_SYNC_FAILED,
        'Sync failed.',
      );
      harness.emitError(WORKSPACE_ID, error);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('does not throw when an error arrives without an onError listener', () => {
      harness.port.subscribe(WORKSPACE_ID, jest.fn());

      const error = createAppError(
        'collaboration',
        ERROR_CODES.COLLABORATION_SYNC_FAILED,
        'Sync failed.',
      );

      expect(() => harness.emitError(WORKSPACE_ID, error)).not.toThrow();
    });

    it('delivers connection status changes to the onConnectionChange listener', () => {
      const onConnectionChange = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

      harness.emitConnectionChange(WORKSPACE_ID, 'reconnecting');
      expect(onConnectionChange).toHaveBeenCalledTimes(1);
      expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');

      harness.emitConnectionChange(WORKSPACE_ID, 'connected');
      expect(onConnectionChange).toHaveBeenCalledTimes(2);
      expect(onConnectionChange).toHaveBeenLastCalledWith('connected');
    });

    it('does not deliver connection changes for a different workspace', () => {
      const onConnectionChange = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

      harness.emitConnectionChange(OTHER_WORKSPACE_ID, 'reconnecting');

      expect(onConnectionChange).not.toHaveBeenCalled();
    });

    it('stops delivering connection changes after unsubscribe', () => {
      const onConnectionChange = jest.fn();
      const unsubscribe = harness.port.subscribe(
        WORKSPACE_ID,
        jest.fn(),
        undefined,
        onConnectionChange,
      );

      unsubscribe();
      harness.emitConnectionChange(WORKSPACE_ID, 'reconnecting');

      expect(onConnectionChange).not.toHaveBeenCalled();
    });

    it('does not throw when a connection change arrives without a listener', () => {
      harness.port.subscribe(WORKSPACE_ID, jest.fn());

      expect(() => harness.emitConnectionChange(WORKSPACE_ID, 'reconnecting')).not.toThrow();
    });

    it('reports one active subscription per subscribe and zero after unsubscribe', () => {
      expect(harness.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);

      const unsubscribe = harness.port.subscribe(WORKSPACE_ID, jest.fn());
      expect(harness.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

      unsubscribe();
      expect(harness.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
    });

    it('delivers each event to every active subscriber', () => {
      const first = jest.fn();
      const second = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, first);
      harness.port.subscribe(WORKSPACE_ID, second);

      const event = joinedEvent(WORKSPACE_ID);
      harness.emit(event);

      expect(first).toHaveBeenCalledWith(event);
      expect(second).toHaveBeenCalledWith(event);
    });

    it('keeps independent subscriptions per workspace', () => {
      const here = jest.fn();
      const elsewhere = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, here);
      harness.port.subscribe(OTHER_WORKSPACE_ID, elsewhere);

      expect(harness.activeSubscriptionCount()).toBe(2);

      harness.emit(joinedEvent(WORKSPACE_ID));
      expect(here).toHaveBeenCalledTimes(1);
      expect(elsewhere).not.toHaveBeenCalled();
    });
  });
}
