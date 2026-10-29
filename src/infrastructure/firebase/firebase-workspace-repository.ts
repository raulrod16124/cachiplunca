import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import type {
  WorkspaceCreateInput,
  WorkspaceRepository,
  WorkspaceUpdateInput,
} from '../../application/ports';
import { WorkspaceId } from '../../domain/shared';
import { Workspace } from '../../domain/workspace';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromWorkspaceDocument, toWorkspaceDocument } from './firebase-workspace-mapper';

const WORKSPACES_COLLECTION = 'workspaces';

export function createFirebaseWorkspaceRepository(db: Firestore): WorkspaceRepository {
  const workspaceRef = (id: WorkspaceId) => doc(collection(db, WORKSPACES_COLLECTION), id.value);

  async function findById(id: WorkspaceId): Promise<Workspace | null> {
    const snapshot = await withMappedErrors(() => getDoc(workspaceRef(id)));
    if (!snapshot.exists()) {
      return null;
    }
    return readWorkspace(snapshot.id, snapshot.data());
  }

  return {
    async create(input: WorkspaceCreateInput): Promise<Workspace> {
      const reference = doc(collection(db, WORKSPACES_COLLECTION));
      const workspace = buildWorkspace(() =>
        Workspace.create({
          id: WorkspaceId.create(reference.id),
          name: input.name,
          createdBy: input.createdBy,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          coverImageStoragePath: input.coverImageStoragePath,
          type: input.type,
        }),
      );

      await withMappedErrors(() => setDoc(reference, toWorkspaceDocument(workspace)));
      return workspace;
    },

    async list(): Promise<Workspace[]> {
      const snapshot = await withMappedErrors(() => getDocs(collection(db, WORKSPACES_COLLECTION)));
      return snapshot.docs.map((document) => readWorkspace(document.id, document.data()));
    },

    findById,

    async update(id: WorkspaceId, updates: WorkspaceUpdateInput): Promise<Workspace> {
      const current = await findById(id);
      if (current === null) {
        throw notFoundError(id);
      }
      const updated = buildWorkspace(() => current.update(updates));

      const changes: DocumentData = { updatedAt: updated.updatedAt };
      if (updates.name !== undefined) {
        changes.name = updated.name;
      }
      if (updates.description !== undefined) {
        changes.description = updated.description;
      }
      if (updates.coverImageUrl !== undefined) {
        changes.coverImageUrl = updated.coverImageUrl;
      }
      if (updates.coverImageStoragePath !== undefined) {
        changes.coverImageStoragePath = updated.coverImageStoragePath;
      }
      if (updates.type !== undefined) {
        changes.type = updated.type;
      }

      await withMappedErrors(() => updateDoc(workspaceRef(id), changes));
      return updated;
    },

    async touchActivity(id: WorkspaceId, at?: Date): Promise<Workspace> {
      const current = await findById(id);
      if (current === null) {
        throw notFoundError(id);
      }
      const touched = buildWorkspace(() => current.touchActivity(at));

      await withMappedErrors(() =>
        updateDoc(workspaceRef(id), { lastActivityAt: touched.lastActivityAt }),
      );
      return touched;
    },

    async delete(id: WorkspaceId): Promise<void> {
      const current = await findById(id);
      if (current === null) {
        throw notFoundError(id);
      }
      await withMappedErrors(() => deleteDoc(workspaceRef(id)));
    },
  };
}

function buildWorkspace(build: () => Workspace): Workspace {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function readWorkspace(id: string, data: DocumentData): Workspace {
  return buildWorkspace(() => fromWorkspaceDocument(id, data));
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid workspace input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function notFoundError(id: WorkspaceId): AppError {
  return createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'The board does not exist.', {
    details: { workspaceId: id.value },
  });
}
