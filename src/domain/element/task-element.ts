import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { TASK_STATUSES, validateTaskElement } from './element-types';
import type { TaskElement, TaskStatus } from './element-types';

export interface CreateTaskElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly title: string;
  readonly status: TaskStatus;
  readonly assigneeId?: UserId;
  readonly dueDate?: Date;
  readonly rotation?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createTaskElement(props: CreateTaskElementProps): TaskElement {
  assertTitle(props.title);
  assertStatus(props.status);
  assertAssignee(props.assigneeId);
  assertDueDate(props.dueDate);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: TaskElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'task',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    title: props.title,
    status: props.status,
    ...(props.assigneeId === undefined ? {} : { assigneeId: props.assigneeId }),
    ...(props.dueDate === undefined ? {} : { dueDate: props.dueDate }),
  };

  validateTaskElement(element);

  return element;
}

export function withTaskTitle(
  element: TaskElement,
  title: string,
  updatedAt: Date = new Date(),
): TaskElement {
  assertTitle(title);

  return buildTaskElement(element, { title, updatedAt });
}

export function withTaskStatus(
  element: TaskElement,
  status: TaskStatus,
  updatedAt: Date = new Date(),
): TaskElement {
  assertStatus(status);

  return buildTaskElement(element, { status, updatedAt });
}

export function withTaskAssignee(
  element: TaskElement,
  assigneeId: UserId | undefined,
  updatedAt: Date = new Date(),
): TaskElement {
  assertAssignee(assigneeId);

  return buildTaskElement(element, { assigneeId, updatedAt });
}

export function withTaskDueDate(
  element: TaskElement,
  dueDate: Date | undefined,
  updatedAt: Date = new Date(),
): TaskElement {
  assertDueDate(dueDate);

  return buildTaskElement(element, { dueDate, updatedAt });
}

interface TaskElementOverrides {
  readonly title?: string;
  readonly status?: TaskStatus;
  readonly assigneeId?: UserId;
  readonly dueDate?: Date;
  readonly updatedAt: Date;
}

function buildTaskElement(element: TaskElement, overrides: TaskElementOverrides): TaskElement {
  const assigneeId = 'assigneeId' in overrides ? overrides.assigneeId : element.assigneeId;
  const dueDate = 'dueDate' in overrides ? overrides.dueDate : element.dueDate;

  const next: TaskElement = {
    id: element.id,
    workspaceId: element.workspaceId,
    type: 'task',
    position: element.position,
    size: element.size,
    rotation: element.rotation,
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    title: overrides.title ?? element.title,
    status: overrides.status ?? element.status,
    ...(assigneeId === undefined ? {} : { assigneeId }),
    ...(dueDate === undefined ? {} : { dueDate }),
  };

  validateTaskElement(next);

  return next;
}

function assertTitle(title: string): void {
  if (typeof title !== 'string') {
    throw new Error('TaskElement title must be a string');
  }
  if (title.trim().length === 0) {
    throw new Error('TaskElement title cannot be empty');
  }
}

function assertStatus(status: TaskStatus): void {
  if (typeof status !== 'string' || !TASK_STATUSES.some((known) => known === status)) {
    throw new Error(`TaskElement status must be one of: ${TASK_STATUSES.join(', ')}`);
  }
}

function assertAssignee(assigneeId: UserId | undefined): void {
  if (assigneeId !== undefined && !(assigneeId instanceof UserId)) {
    throw new Error('TaskElement assigneeId must be a UserId');
  }
}

function assertDueDate(dueDate: Date | undefined): void {
  if (dueDate !== undefined && (!(dueDate instanceof Date) || Number.isNaN(dueDate.getTime()))) {
    throw new Error('TaskElement dueDate must be a valid Date');
  }
}
