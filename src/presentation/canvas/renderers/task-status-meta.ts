import type { BadgeVariant } from '@raulrod/ui';
import type { TaskStatus } from '../../../domain/element';

export interface TaskStatusMeta {
  readonly label: string;
  readonly variant: BadgeVariant;
}

/**
 * Presentation-only mapping of a task status to its visible label and the
 * `@raulrod/ui` badge tint. Colors are a UI concern, so the domain keeps only
 * the status value (TODO gray, IN PROGRESS orange, COMPLETED green, BLOCKED red).
 */
export const TASK_STATUS_META: Record<TaskStatus, TaskStatusMeta> = {
  todo: { label: 'Todo', variant: 'neutral' },
  in_progress: { label: 'In progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'destructive' },
};
