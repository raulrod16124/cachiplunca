import type { Comment } from '../../domain/comment';
import { WorkspaceId } from '../../domain/shared';
import { isAppError, type AppError } from '../../shared/errors';
import type { CommentRepository } from '../ports';
import { toValidationAppError } from '../commands/to-validation-app-error';

export interface ListWorkspaceCommentsInput {
  readonly workspaceId: string;
}

export type ListWorkspaceCommentsResult =
  | { readonly status: 'ok'; readonly comments: Comment[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListWorkspaceComments = (
  input: ListWorkspaceCommentsInput,
) => Promise<ListWorkspaceCommentsResult>;

export function createListWorkspaceComments(repository: CommentRepository): ListWorkspaceComments {
  return async (input: ListWorkspaceCommentsInput): Promise<ListWorkspaceCommentsResult> => {
    try {
      const comments = await repository.listByWorkspace(WorkspaceId.create(input.workspaceId));
      return { status: 'ok', comments };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}
