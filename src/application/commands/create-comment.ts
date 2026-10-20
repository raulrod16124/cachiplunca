import { Comment } from '../../domain/comment';
import type { CommentId, ElementId, UserId, WorkspaceId } from '../../domain/shared';
import { isAppError, type AppError } from '../../shared/errors';
import type { CommentRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export interface CreateCommentInput {
  readonly workspaceId: WorkspaceId;
  readonly elementId: ElementId;
  readonly authorId: UserId;
  readonly body: string;
}

export interface CreateCommentDeps {
  readonly repository: CommentRepository;
  readonly generateId: () => CommentId;
  readonly now?: () => Date;
}

export type CreateCommentResult =
  | { readonly status: 'ok'; readonly comment: Comment }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateComment = (input: CreateCommentInput) => Promise<CreateCommentResult>;

export function createCreateComment(deps: CreateCommentDeps): CreateComment {
  return async (input: CreateCommentInput): Promise<CreateCommentResult> => {
    try {
      const comment = Comment.create({
        id: deps.generateId(),
        workspaceId: input.workspaceId,
        elementId: input.elementId,
        authorId: input.authorId,
        body: input.body,
        createdAt: deps.now === undefined ? undefined : deps.now(),
      });
      const saved = await deps.repository.save(comment);
      return { status: 'ok', comment: saved };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}
