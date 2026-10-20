import type { CreateComment, ResolveComment } from './commands';
import type { ListComments } from './queries';

export interface CommentServices {
  readonly listComments: ListComments;
  readonly createComment: CreateComment;
  readonly resolveComment: ResolveComment;
}
