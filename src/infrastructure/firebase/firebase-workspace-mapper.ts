import { WorkspaceId } from '../../domain/shared';
import { Workspace } from '../../domain/workspace';

export interface WorkspaceDocument {
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly description: string | null;
}

export function toWorkspaceDocument(workspace: Workspace): WorkspaceDocument {
  return {
    name: workspace.name,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    description: workspace.description,
  };
}

export function fromWorkspaceDocument(id: string, data: unknown): Workspace {
  if (!isRecord(data)) {
    throw new Error('Workspace document must be an object');
  }
  if (typeof data.name !== 'string') {
    throw new Error('Workspace document field "name" must be a string');
  }

  return Workspace.create({
    id: WorkspaceId.create(id),
    name: data.name,
    description: readDescription(data.description),
    createdAt: readDate(data.createdAt, 'createdAt'),
    updatedAt: readDate(data.updatedAt, 'updatedAt'),
  });
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Workspace document field "${field}" must be a Date or Timestamp`);
  }
  if (isNaN(date.getTime())) {
    throw new Error(`Workspace document field "${field}" must be a valid Date`);
  }
  return date;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (isRecord(value) && typeof value.toDate === 'function') {
    const date: unknown = value.toDate();
    if (date instanceof Date) {
      return date;
    }
  }
  return undefined;
}

function readDescription(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('Workspace document field "description" must be a string or null');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
