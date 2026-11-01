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

export type TaskBoardDropPosition =
  | { readonly kind: 'start' }
  | { readonly kind: 'end' }
  | { readonly kind: 'before'; readonly taskId: string };

export function selectTaskPlan(
  elements: readonly Element[],
  filters: TaskPlanFilters,
): readonly TaskPlanGroup[] {
  return selectTaskPlanBoard(elements, filters)
    .map((group) => ({
      status: group.status,
      tasks: [...group.tasks].sort(compareTasks),
    }))
    .filter((group) => group.tasks.length > 0);
}

export function selectTaskPlanBoard(
  elements: readonly Element[],
  filters: TaskPlanFilters,
): readonly TaskPlanGroup[] {
  const tasks = elements.filter(isTaskElement).filter((task) => matchesFilters(task, filters));

  return TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status).sort(compareBoardOrder),
  }));
}

export function nextBoardOrderForStatusChange(
  elements: readonly Element[],
  status: TaskStatus,
): number {
  return resolveBoardOrderForDrop(elements, status, { kind: 'end' });
}

export function isBoardDropNoop(
  elements: readonly Element[],
  taskId: string,
  status: TaskStatus,
  position: TaskBoardDropPosition,
): boolean {
  const columnTasks = tasksInStatus(elements, status);
  const index = columnTasks.findIndex((task) => task.id.value === taskId);

  if (index === -1) {
    return false;
  }

  if (position.kind === 'end') {
    return index === columnTasks.length - 1;
  }

  if (position.kind === 'start') {
    return index === 0;
  }

  const targetIndex = columnTasks.findIndex((task) => task.id.value === position.taskId);

  if (targetIndex === -1) {
    return index === columnTasks.length - 1;
  }

  return index + 1 === targetIndex;
}

export function resolveBoardOrderForDrop(
  elements: readonly Element[],
  status: TaskStatus,
  position: TaskBoardDropPosition,
): number {
  const columnTasks = tasksInStatus(elements, status);

  if (columnTasks.length === 0) {
    return 0;
  }

  const first = columnTasks[0].boardOrder;
  const last = columnTasks[columnTasks.length - 1].boardOrder;

  if (position.kind === 'end') {
    return last + 1;
  }

  if (position.kind === 'start') {
    return first - 1;
  }

  const index = columnTasks.findIndex((task) => task.id.value === position.taskId);

  if (index <= 0) {
    return first - 1;
  }

  const previous = columnTasks[index - 1].boardOrder;
  const target = columnTasks[index].boardOrder;

  if (previous >= target) {
    return target - 0.5;
  }

  return (previous + target) / 2;
}

function tasksInStatus(elements: readonly Element[], status: TaskStatus): readonly TaskElement[] {
  return elements
    .filter(isTaskElement)
    .filter((task) => task.status === status)
    .sort(compareBoardOrder);
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

function compareBoardOrder(left: TaskElement, right: TaskElement): number {
  if (left.boardOrder !== right.boardOrder) {
    return left.boardOrder - right.boardOrder;
  }

  return left.id.value.localeCompare(right.id.value);
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
