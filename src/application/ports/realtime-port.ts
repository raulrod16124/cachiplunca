import type { Element } from '../../domain/element';
import type { ElementId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

export type RealtimeChangeOrigin = 'local' | 'remote';

export interface AddedElementChange {
  readonly kind: 'added';
  readonly element: Element;
  readonly origin: RealtimeChangeOrigin;
}

export interface ModifiedElementChange {
  readonly kind: 'modified';
  readonly element: Element;
  readonly origin: RealtimeChangeOrigin;
}

export interface RemovedElementChange {
  readonly kind: 'removed';
  readonly elementId: ElementId;
  readonly origin: RealtimeChangeOrigin;
}

export type ElementRealtimeChange =
  AddedElementChange | ModifiedElementChange | RemovedElementChange;

export interface ElementRealtimeEvent {
  readonly workspaceId: WorkspaceId;
  readonly changes: readonly ElementRealtimeChange[];
}

export type RealtimeEventListener = (event: ElementRealtimeEvent) => void;

export type RealtimeErrorListener = (error: AppError) => void;

export interface RealtimePort {
  subscribe(
    workspaceId: WorkspaceId,
    listener: RealtimeEventListener,
    onError?: RealtimeErrorListener,
  ): Unsubscribe;
}
