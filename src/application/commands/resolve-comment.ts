import type { Comment } from '../../domain/comment';
import { CommentId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { CommentRepository } from '../ports';
import {
  recordActivityBestEffort,
  type RecordWorkspaceActivity,
} from '../services/record-activity';
import { toValidationAppError } from './to-validation-app-error';

export interface ResolveCommentInput {
  readonly workspaceId: string;
  readonly commentId: string;
}

export interface ResolveCommentDeps {
  readonly repository: CommentRepository;
  readonly recordActivity?: RecordWorkspaceActivity;
  readonly now?: () => Date;
}

export type ResolveCommentResult =
  | { readonly status: 'ok'; readonly comment: Comment }
  | { readonly status: 'error'; readonly error: AppError };

export type ResolveComment = (input: ResolveCommentInput) => Promise<ResolveCommentResult>;

export function createResolveComment(deps: ResolveCommentDeps): ResolveComment {
  return async (input: ResolveCommentInput): Promise<ResolveCommentResult> => {
    try {
      const workspaceId = WorkspaceId.create(input.workspaceId);
      const commentId = CommentId.create(input.commentId);
      const current = await deps.repository.findById(workspaceId, commentId);

      if (current === null) {
        return { status: 'error', error: notFoundError(input.commentId) };
      }

      const resolvedAt = deps.now === undefined ? new Date() : deps.now();
      const resolved = current.resolve(resolvedAt);
      const saved = await deps.repository.save(resolved);
      await recordActivityBestEffort(deps.recordActivity, workspaceId, resolvedAt);
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
