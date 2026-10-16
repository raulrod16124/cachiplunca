import type { Presence } from '../../domain/collaboration';
import type { UserId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import type { RealtimeChangeOrigin, RealtimeConnectionListener } from './realtime-port';

export interface JoinedPresenceChange {
  readonly kind: 'joined';
  readonly presence: Presence;
  readonly origin: RealtimeChangeOrigin;
}

export interface UpdatedPresenceChange {
  readonly kind: 'updated';
  readonly presence: Presence;
  readonly origin: RealtimeChangeOrigin;
}

export interface LeftPresenceChange {
  readonly kind: 'left';
  readonly userId: UserId;
  readonly origin: RealtimeChangeOrigin;
}

export type PresenceChange = JoinedPresenceChange | UpdatedPresenceChange | LeftPresenceChange;

export interface PresenceEvent {
  readonly workspaceId: WorkspaceId;
  readonly changes: readonly PresenceChange[];
}

export type PresenceListener = (event: PresenceEvent) => void;

export type PresenceErrorListener = (error: AppError) => void;

export interface PresencePort {
  subscribe(
    workspaceId: WorkspaceId,
    listener: PresenceListener,
    onError?: PresenceErrorListener,
    onConnectionChange?: RealtimeConnectionListener,
  ): Unsubscribe;

  announce(presence: Presence): Promise<void>;

  withdraw(workspaceId: WorkspaceId, userId: UserId): Promise<void>;
}
