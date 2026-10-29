import { UserId, WorkspaceId } from '../../domain/shared';
import { WORKSPACE_TYPES, Workspace, type WorkspaceType } from '../../domain/workspace';

export interface WorkspaceDocument {
  readonly name: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActivityAt: Date;
  readonly description: string | null;
  readonly coverImageUrl: string | null;
  readonly coverImageStoragePath: string | null;
  readonly type: WorkspaceType;
}

function readWorkspaceType(value: unknown): WorkspaceType {
  if (value === undefined || value === null) {
    return 'general';
  }

  if (typeof value !== 'string') {
    throw new Error('Workspace document field "type" must be a string');
  }

  if ((WORKSPACE_TYPES as readonly string[]).includes(value)) {
    return value as WorkspaceType;
  }

  throw new Error('Invalid workspace type');
}

export function toWorkspaceDocument(workspace: Workspace): WorkspaceDocument {
  return {
    name: workspace.name,
    createdBy: workspace.createdBy.value,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    lastActivityAt: workspace.lastActivityAt,
    description: workspace.description,
    coverImageUrl: workspace.coverImageUrl,
    coverImageStoragePath: workspace.coverImageStoragePath,
    type: workspace.type,
  };
}

export function fromWorkspaceDocument(id: string, data: unknown): Workspace {
  if (!isRecord(data)) {
    throw new Error('Workspace document must be an object');
  }
  if (typeof data.name !== 'string') {
    throw new Error('Workspace document field "name" must be a string');
  }

  const createdAt = readDate(data.createdAt, 'createdAt');
  const updatedAt = readDate(data.updatedAt, 'updatedAt');

  return Workspace.create({
    id: WorkspaceId.create(id),
    name: data.name,
    createdBy: UserId.create(readString(data.createdBy, 'createdBy')),
    description: readDescription(data.description),
    coverImageUrl: readNullableString(data.coverImageUrl, 'coverImageUrl'),
    coverImageStoragePath: readNullableString(data.coverImageStoragePath, 'coverImageStoragePath'),
    createdAt,
    updatedAt,
    lastActivityAt: readOptionalDate(data.lastActivityAt, 'lastActivityAt') ?? updatedAt,
    type: readWorkspaceType(data.type),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Workspace document field "${field}" must be a string`);
  }
  return value;
}

function readOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return readDate(value, field);
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

function readNullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Workspace document field "${field}" must be a string or null`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
