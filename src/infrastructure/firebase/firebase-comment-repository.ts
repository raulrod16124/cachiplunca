import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { CommentRepository } from '../../application/ports';
import type { Comment } from '../../domain/comment';
import { CommentId, ElementId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromCommentDocument, toCommentDocument } from './firebase-comment-mapper';

const COMMENTS_COLLECTION = 'comments';

export function createFirebaseCommentRepository(db: Firestore): CommentRepository {
  const commentsCollection = (workspaceId: WorkspaceId) =>
    collection(db, 'workspaces', workspaceId.value, COMMENTS_COLLECTION);
  const commentRef = (workspaceId: WorkspaceId, commentId: CommentId) =>
    doc(commentsCollection(workspaceId), commentId.value);

  return {
    async listByWorkspace(workspaceId: WorkspaceId): Promise<Comment[]> {
      const snapshot = await withMappedErrors(() => getDocs(commentsCollection(workspaceId)));
      return snapshot.docs.map((document) => readComment(document.data()));
    },

    async listByElement(workspaceId: WorkspaceId, elementId: ElementId): Promise<Comment[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(query(commentsCollection(workspaceId), where('elementId', '==', elementId.value))),
      );
      return snapshot.docs.map((document) => readComment(document.data()));
    },

    async findById(workspaceId: WorkspaceId, commentId: CommentId): Promise<Comment | null> {
      const snapshot = await withMappedErrors(() => getDoc(commentRef(workspaceId, commentId)));
      if (!snapshot.exists()) {
        return null;
      }
      return readComment(snapshot.data());
    },

    async save(comment: Comment): Promise<Comment> {
      await withMappedErrors(() =>
        setDoc(commentRef(comment.workspaceId, comment.id), toCommentDocument(comment)),
      );
      return comment;
    },
  };
}

function readComment(data: unknown): Comment {
  try {
    return fromCommentDocument(data);
  } catch (error) {
    throw toValidationError(error);
  }
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
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid comment input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}
