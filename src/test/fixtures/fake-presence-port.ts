import type {
  PresenceChange,
  PresenceErrorListener,
  PresenceEvent,
  PresenceListener,
  PresencePort,
  RealtimeConnectionListener,
  RealtimeConnectionStatus,
} from '../../application/ports';
import type { Presence } from '../../domain/collaboration';
import type { UserId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

interface Subscription {
  readonly listener: PresenceListener;
  readonly onError: PresenceErrorListener | undefined;
  readonly onConnectionChange: RealtimeConnectionListener | undefined;
}

export class FakePresencePort implements PresencePort {
  readonly #subscriptions = new Map<string, Set<Subscription>>();
  readonly #presences = new Map<string, Map<string, Presence>>();

  subscribe(
    workspaceId: WorkspaceId,
    listener: PresenceListener,
    onError?: PresenceErrorListener,
    onConnectionChange?: RealtimeConnectionListener,
  ): Unsubscribe {
    const subscription: Subscription = { listener, onError, onConnectionChange };
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

  announce(presence: Presence): Promise<void> {
    const workspaceId = presence.workspaceId;
    const byUser = this.#presences.get(workspaceId.value) ?? new Map<string, Presence>();
    const existed = byUser.has(presence.userId.value);
    byUser.set(presence.userId.value, presence);
    this.#presences.set(workspaceId.value, byUser);

    this.emit({
      workspaceId,
      changes: [{ kind: existed ? 'updated' : 'joined', presence, origin: 'local' }],
    });

    return Promise.resolve();
  }

  withdraw(workspaceId: WorkspaceId, userId: UserId): Promise<void> {
    const byUser = this.#presences.get(workspaceId.value);

    if (byUser === undefined || !byUser.delete(userId.value)) {
      return Promise.resolve();
    }

    this.emit({
      workspaceId,
      changes: [{ kind: 'left', userId, origin: 'local' }],
    });

    return Promise.resolve();
  }

  emit(event: PresenceEvent): void {
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

  emitConnectionChange(workspaceId: WorkspaceId, status: RealtimeConnectionStatus): void {
    const subscriptions = this.#subscriptions.get(workspaceId.value);
    if (subscriptions === undefined) {
      return;
    }
    for (const subscription of subscriptions) {
      subscription.onConnectionChange?.(status);
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

  activePresenceCount(workspaceId: WorkspaceId): number {
    return this.#presences.get(workspaceId.value)?.size ?? 0;
  }

  presenceOf(workspaceId: WorkspaceId, userId: UserId): Presence | undefined {
    return this.#presences.get(workspaceId.value)?.get(userId.value);
  }

  emitChanges(workspaceId: WorkspaceId, changes: readonly PresenceChange[]): void {
    this.emit({ workspaceId, changes });
  }
}
