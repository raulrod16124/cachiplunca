import type {
  ElementRealtimeEvent,
  RealtimeErrorListener,
  RealtimeEventListener,
  RealtimePort,
} from '../../application/ports';
import type { WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

interface Subscription {
  readonly listener: RealtimeEventListener;
  readonly onError: RealtimeErrorListener | undefined;
}

export class FakeRealtimePort implements RealtimePort {
  readonly #subscriptions = new Map<string, Set<Subscription>>();

  subscribe(
    workspaceId: WorkspaceId,
    listener: RealtimeEventListener,
    onError?: RealtimeErrorListener,
  ): Unsubscribe {
    const subscription: Subscription = { listener, onError };
    const subscriptions = this.#subscriptions.get(workspaceId.value) ?? new Set<Subscription>();
    subscriptions.add(subscription);
    this.#subscriptions.set(workspaceId.value, subscriptions);

    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      subscriptions.delete(subscription);
      if (subscriptions.size === 0) {
        this.#subscriptions.delete(workspaceId.value);
      }
    };
  }

  emit(event: ElementRealtimeEvent): void {
    const subscriptions = this.#subscriptions.get(event.workspaceId.value);
    if (subscriptions === undefined) {
      return;
    }
    for (const subscription of subscriptions) {
      subscription.listener(event);
    }
  }

  emitError(workspaceId: WorkspaceId, error: AppError): void {
    const subscriptions = this.#subscriptions.get(workspaceId.value);
    if (subscriptions === undefined) {
      return;
    }
    for (const subscription of subscriptions) {
      subscription.onError?.(error);
    }
  }

  activeSubscriptionCount(workspaceId?: WorkspaceId): number {
    if (workspaceId !== undefined) {
      return this.#subscriptions.get(workspaceId.value)?.size ?? 0;
    }

    let count = 0;
    for (const subscriptions of this.#subscriptions.values()) {
      count += subscriptions.size;
    }
    return count;
  }
}
