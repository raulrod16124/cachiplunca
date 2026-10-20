import type { Comment } from '../../domain/comment';
import type { CommentId, ElementId, WorkspaceId } from '../../domain/shared';

export interface CommentRepository {
  listByWorkspace(workspaceId: WorkspaceId): Promise<Comment[]>;
  listByElement(workspaceId: WorkspaceId, elementId: ElementId): Promise<Comment[]>;
  findById(workspaceId: WorkspaceId, commentId: CommentId): Promise<Comment | null>;
  save(comment: Comment): Promise<Comment>;
}
