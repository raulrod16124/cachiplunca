import type { BadgeVariant } from '@raulrod/ui';
import type { TaskStatus } from '../../../domain/element';
import type { TranslationKey } from '../../i18n';

export interface TaskStatusMeta {
  readonly variant: BadgeVariant;
}

/**
 * Presentation-only mapping of a task status to its `@raulrod/ui` badge tint.
 * The visible label lives in i18n (`task.status.*`) so the UI stays localized.
 */
export const TASK_STATUS_META: Record<TaskStatus, TaskStatusMeta> = {
  todo: { variant: 'neutral' },
  in_progress: { variant: 'warning' },
  completed: { variant: 'success' },
  blocked: { variant: 'destructive' },
};

export const TASK_STATUS_LABEL_KEYS: Record<TaskStatus, TranslationKey> = {
  todo: 'task.status.todo',
  in_progress: 'task.status.in_progress',
  completed: 'task.status.completed',
  blocked: 'task.status.blocked',
};
