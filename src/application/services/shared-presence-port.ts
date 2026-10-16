import type { Presence } from '../../domain/collaboration';
import type { UserId, WorkspaceId } from '../../domain/shared';
import type { Unsubscribe } from '../../shared/types';
import type {
  PresenceErrorListener,
  PresenceEvent,
  PresenceListener,
  PresencePort,
  RealtimeConnectionListener,
} from '../ports';

interface PresenceChannel {
  readonly listeners: Set<PresenceListener>;
  readonly errorListeners: Set<PresenceErrorListener>;
  readonly connectionListeners: Set<RealtimeConnectionListener>;
  readonly unsubscribeFromPort: Unsubscribe;
}

/**
 * Decorator over a {@link PresencePort} that multiplexes every consumer of a
 * workspace onto a single underlying `subscribe` (one listener, one Firestore
 * subscription), fanning events/errors/connection changes out to each of them
 * and tearing the channel down when the last consumer unsubscribes. Keeps
 * independent stores (remote cursors, connected users) from opening duplicate
 * presence listeners while preserving the `PresencePort` contract — writes
 * (`announce`/`withdraw`) pass straight through.
 */
export function createSharedPresencePort(port: PresencePort): PresencePort {
  const channels = new Map<string, PresenceChannel>();

  function openChannel(workspaceId: WorkspaceId): PresenceChannel {
    const listeners = new Set<PresenceListener>();
    const errorListeners = new Set<PresenceErrorListener>();
    const connectionListeners = new Set<RealtimeConnectionListener>();

    const unsubscribeFromPort = port.subscribe(
      workspaceId,
      (event: PresenceEvent) => {
        for (const listener of listeners) {
          listener(event);
        }
      },
      (error) => {
        for (const errorListener of errorListeners) {
          errorListener(error);
        }
      },
      (status) => {
        for (const connectionListener of connectionListeners) {
          connectionListener(status);
        }
      },
    );

    const channel: PresenceChannel = {
      listeners,
      errorListeners,
      connectionListeners,
      unsubscribeFromPort,
    };
    channels.set(workspaceId.value, channel);
    return channel;
  }

  return {
    subscribe(workspaceId, listener, onError, onConnectionChange) {
      const channel = channels.get(workspaceId.value) ?? openChannel(workspaceId);

      channel.listeners.add(listener);
      if (onError !== undefined) {
        channel.errorListeners.add(onError);
      }
      if (onConnectionChange !== undefined) {
        channel.connectionListeners.add(onConnectionChange);
      }

      let active = true;
      return () => {
        if (!active) {
          return;
        }
        active = false;
        channel.listeners.delete(listener);
        if (onError !== undefined) {
          channel.errorListeners.delete(onError);
        }
        if (onConnectionChange !== undefined) {
          channel.connectionListeners.delete(onConnectionChange);
        }
        if (channel.listeners.size === 0) {
          channel.unsubscribeFromPort();
          channels.delete(workspaceId.value);
        }
      };
    },
    announce: (presence: Presence) => port.announce(presence),
    withdraw: (workspaceId: WorkspaceId, userId: UserId) => port.withdraw(workspaceId, userId),
  };
}
