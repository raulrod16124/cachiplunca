import type { CreateComment, EditComment, ResolveComment } from './commands';
import type { ListComments, ListWorkspaceComments } from './queries';

export interface CommentServices {
  readonly listWorkspaceComments: ListWorkspaceComments;
  readonly listComments: ListComments;
  readonly createComment: CreateComment;
  readonly editComment: EditComment;
  readonly resolveComment: ResolveComment;
}
