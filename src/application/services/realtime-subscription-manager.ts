import type { WorkspaceId } from '../../domain/shared';
import type { Unsubscribe } from '../../shared/types';
import type { RealtimeErrorListener, RealtimeEventListener, RealtimePort } from '../ports';

export interface RealtimeSubscriptionManager {
  subscribe(
    workspaceId: WorkspaceId,
    listener: RealtimeEventListener,
    onError?: RealtimeErrorListener,
  ): Unsubscribe;
  dispose(): void;
}

interface WorkspaceChannel {
  readonly listeners: Set<RealtimeEventListener>;
  readonly errorListeners: Set<RealtimeErrorListener>;
  readonly unsubscribeFromPort: Unsubscribe;
}

export function createRealtimeSubscriptionManager(port: RealtimePort): RealtimeSubscriptionManager {
  const channels = new Map<string, WorkspaceChannel>();

  function openChannel(workspaceId: WorkspaceId): WorkspaceChannel {
    const listeners = new Set<RealtimeEventListener>();
    const errorListeners = new Set<RealtimeErrorListener>();

    const unsubscribeFromPort = port.subscribe(
      workspaceId,
      (event) => {
        for (const listener of listeners) {
          listener(event);
        }
      },
      (error) => {
        for (const errorListener of errorListeners) {
          errorListener(error);
        }
      },
    );

    const channel: WorkspaceChannel = { listeners, errorListeners, unsubscribeFromPort };
    channels.set(workspaceId.value, channel);
    return channel;
  }

  return {
    subscribe(workspaceId, listener, onError) {
      const channel = channels.get(workspaceId.value) ?? openChannel(workspaceId);
      channel.listeners.add(listener);
      if (onError !== undefined) {
        channel.errorListeners.add(onError);
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
        if (channel.listeners.size === 0) {
          channel.unsubscribeFromPort();
          channels.delete(workspaceId.value);
        }
      };
    },

    dispose() {
      for (const channel of channels.values()) {
        channel.unsubscribeFromPort();
      }
      channels.clear();
    },
  };
}
