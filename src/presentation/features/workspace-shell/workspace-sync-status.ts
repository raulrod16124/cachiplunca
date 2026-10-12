import type { BadgeVariant } from '@raulrod/ui';
import type { PersistenceSyncStatus } from '../../../application/services';

export interface SyncStatusBadge {
  readonly label: string;
  readonly variant: BadgeVariant;
}

export function describeSyncStatus(status: PersistenceSyncStatus): SyncStatusBadge | null {
  switch (status) {
    case 'idle':
      return null;
    case 'saving':
      return { label: 'Saving…', variant: 'info' };
    case 'saved':
      return { label: 'Saved', variant: 'success' };
    case 'error':
      return { label: 'Not saved', variant: 'destructive' };
  }
}
