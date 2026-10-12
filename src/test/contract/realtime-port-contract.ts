import type { ElementRealtimeEvent, RealtimePort } from '../../application/ports';
import { createTextElement, type Element } from '../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';

export interface RealtimePortHarness {
  readonly port: RealtimePort;
  emit(event: ElementRealtimeEvent): void;
  emitError(workspaceId: WorkspaceId, error: AppError): void;
  activeSubscriptionCount(workspaceId?: WorkspaceId): number;
}

type HarnessFactory = () => RealtimePortHarness;

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

export function describeRealtimePortContract(
  suiteName: string,
  createHarness: HarnessFactory,
): void {
  describe(suiteName, () => {
    let harness: RealtimePortHarness;

    beforeEach(() => {
      harness = createHarness();
    });

    it('delivers emitted events to a subscriber', () => {
      const listener = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, listener);

      const event = addedEvent(WORKSPACE_ID, 'el-1');
      harness.emit(event);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('does not deliver events for a different workspace', () => {
      const listener = jest.fn();
      harness.port.subscribe(WORKSPACE_ID, listener);

      harness.emit(addedEvent(OTHER_WORKSPACE_ID, 'el-other'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops delivering events after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = harness.port.subscribe(WORKSPACE_ID, listener);

      harness.emit(addedEvent(WORKSPACE_ID, 'el-1'));
      unsubscribe();
      harness.emit(addedEvent(WORKSPACE_ID, 'el-2'));

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

      const event = addedEvent(WORKSPACE_ID, 'el-1');
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

      harness.emit(addedEvent(WORKSPACE_ID, 'el-1'));
      expect(here).toHaveBeenCalledTimes(1);
      expect(elsewhere).not.toHaveBeenCalled();
    });
  });
}
