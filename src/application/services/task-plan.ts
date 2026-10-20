import { TASK_STATUSES, isTaskElement } from '../../domain/element';
import type { Element, TaskElement, TaskStatus } from '../../domain/element';

export type TaskPlanStatusFilter = TaskStatus | 'all';

export interface TaskPlanFilters {
  readonly status: TaskPlanStatusFilter;
  readonly onlyMine: boolean;
  readonly currentUserId?: string;
}

export interface TaskPlanGroup {
  readonly status: TaskStatus;
  readonly tasks: readonly TaskElement[];
}

export function selectTaskPlan(
  elements: readonly Element[],
  filters: TaskPlanFilters,
): readonly TaskPlanGroup[] {
  const tasks = elements.filter(isTaskElement).filter((task) => matchesFilters(task, filters));
  const groups: TaskPlanGroup[] = [];

  for (const status of TASK_STATUSES) {
    const statusTasks = tasks.filter((task) => task.status === status).sort(compareTasks);

    if (statusTasks.length > 0) {
      groups.push({ status, tasks: statusTasks });
    }
  }

  return groups;
}

function matchesFilters(task: TaskElement, filters: TaskPlanFilters): boolean {
  if (filters.status !== 'all' && task.status !== filters.status) {
    return false;
  }

  if (!filters.onlyMine) {
    return true;
  }

  return filters.currentUserId !== undefined && task.assigneeId?.value === filters.currentUserId;
}

function compareTasks(left: TaskElement, right: TaskElement): number {
  const leftDue = left.dueDate?.getTime();
  const rightDue = right.dueDate?.getTime();

  if (leftDue !== undefined && rightDue !== undefined && leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  if (leftDue !== undefined && rightDue === undefined) {
    return -1;
  }

  if (leftDue === undefined && rightDue !== undefined) {
    return 1;
  }

  const createdDiff = left.createdAt.getTime() - right.createdAt.getTime();

  if (createdDiff !== 0) {
    return createdDiff;
  }

  return left.id.value.localeCompare(right.id.value);
}
