import type { BadgeVariant } from '@raulrod/ui';
import type { RealtimeConnectionStatus } from '../../../application/ports';
import type { PersistenceSyncStatus } from '../../../application/services';

export type SyncStatusIcon = 'cloud-check' | 'spinner' | 'alert';

export interface SyncStatusBadge {
  readonly label: string;
  readonly variant: BadgeVariant;
  readonly icon: SyncStatusIcon;
}

export interface ConnectionStatusBadge {
  readonly label: string;
  readonly variant: BadgeVariant;
}

export function describeSyncStatus(status: PersistenceSyncStatus): SyncStatusBadge | null {
  switch (status) {
    case 'idle':
      return null;
    case 'saving':
      return { label: 'Saving…', variant: 'info', icon: 'spinner' };
    case 'saved':
      return { label: 'Saved', variant: 'success', icon: 'cloud-check' };
    case 'error':
      return { label: 'Not saved', variant: 'destructive', icon: 'alert' };
  }
}

export function describeConnectionStatus(
  status: RealtimeConnectionStatus,
): ConnectionStatusBadge | null {
  switch (status) {
    case 'connected':
      return null;
    case 'reconnecting':
      return { label: 'Reconnecting…', variant: 'warning' };
  }
}
