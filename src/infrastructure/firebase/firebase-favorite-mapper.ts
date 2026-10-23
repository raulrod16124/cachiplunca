import { Favorite, FavoriteId } from '../../domain/favorite';
import { UserId, WorkspaceId } from '../../domain/shared';

export interface FavoriteDocument {
  readonly id: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly createdAt: Date;
}

export function toFavoriteDocument(favorite: Favorite): FavoriteDocument {
  const json = favorite.toJSON();
  return {
    id: json.id,
    userId: json.userId,
    workspaceId: json.workspaceId,
    createdAt: favorite.createdAt,
  };
}

export function fromFavoriteDocument(id: string, data: unknown): Favorite {
  if (!isRecord(data)) {
    throw new Error('Favorite document must be an object');
  }

  const documentId = readString(data.id, 'id');
  if (documentId !== id) {
    throw new Error('Favorite document field "id" must match the document id');
  }

  return Favorite.fromPersistence({
    id: FavoriteId.create(documentId),
    userId: UserId.create(readString(data.userId, 'userId')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    createdAt: readDate(data.createdAt, 'createdAt'),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Favorite document field "${field}" must be a non-empty string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Favorite document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Favorite document field "${field}" must be a valid Date`);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
