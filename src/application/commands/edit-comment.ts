import type { Comment } from '../../domain/comment';
import { CommentId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { CommentRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export interface EditCommentInput {
  readonly workspaceId: string;
  readonly commentId: string;
  readonly actorId: string;
  readonly body: string;
}

export interface EditCommentDeps {
  readonly repository: CommentRepository;
  readonly now?: () => Date;
}

export type EditCommentResult =
  | { readonly status: 'ok'; readonly comment: Comment }
  | { readonly status: 'error'; readonly error: AppError };

export type EditComment = (input: EditCommentInput) => Promise<EditCommentResult>;

export function createEditComment(deps: EditCommentDeps): EditComment {
  return async (input: EditCommentInput): Promise<EditCommentResult> => {
    try {
      const workspaceId = WorkspaceId.create(input.workspaceId);
      const commentId = CommentId.create(input.commentId);
      const current = await deps.repository.findById(workspaceId, commentId);

      if (current === null) {
        return { status: 'error', error: notFoundError(input.commentId) };
      }

      if (current.authorId.value !== input.actorId) {
        return { status: 'error', error: forbiddenError(input.commentId) };
      }

      const editedAt = deps.now === undefined ? new Date() : deps.now();
      const edited = current.editBody(input.body, editedAt);
      const saved = await deps.repository.save(edited);
      return { status: 'ok', comment: saved };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}

function notFoundError(commentId: string): AppError {
  return createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'The comment does not exist.', {
    details: { commentId },
  });
}

function forbiddenError(commentId: string): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'Only the comment author can edit it.',
    { details: { commentId } },
  );
}
