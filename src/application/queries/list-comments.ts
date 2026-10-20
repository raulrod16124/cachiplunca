import type { Comment } from '../../domain/comment';
import { ElementId, WorkspaceId } from '../../domain/shared';
import { isAppError, type AppError } from '../../shared/errors';
import type { CommentRepository } from '../ports';
import { toValidationAppError } from '../commands/to-validation-app-error';

export interface ListCommentsInput {
  readonly workspaceId: string;
  readonly elementId: string;
}

export type ListCommentsResult =
  | { readonly status: 'ok'; readonly comments: Comment[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListComments = (input: ListCommentsInput) => Promise<ListCommentsResult>;

export function sortComments(comments: readonly Comment[]): Comment[] {
  return [...comments].sort(compareComments);
}

function compareComments(a: Comment, b: Comment): number {
  const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.id.value === b.id.value) {
    return 0;
  }
  return a.id.value < b.id.value ? -1 : 1;
}

export function createListComments(repository: CommentRepository): ListComments {
  return async (input: ListCommentsInput): Promise<ListCommentsResult> => {
    try {
      const comments = await repository.listByElement(
        WorkspaceId.create(input.workspaceId),
        ElementId.create(input.elementId),
      );
      return { status: 'ok', comments: sortComments(comments) };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}
