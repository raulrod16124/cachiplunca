import type { Comment } from '../../domain/comment';
import type { CommentId, ElementId, WorkspaceId } from '../../domain/shared';
import type { CommentRepository } from '../../application/ports';

function keyOf(workspaceId: WorkspaceId, commentId: CommentId): string {
  return `${workspaceId.value}/${commentId.value}`;
}

export class FakeCommentRepository implements CommentRepository {
  #comments = new Map<string, Comment>();

  async listByElement(workspaceId: WorkspaceId, elementId: ElementId): Promise<Comment[]> {
    return [...this.#comments.values()].filter(
      (comment) => comment.workspaceId.equals(workspaceId) && comment.elementId.equals(elementId),
    );
  }

  async findById(workspaceId: WorkspaceId, commentId: CommentId): Promise<Comment | null> {
    return this.#comments.get(keyOf(workspaceId, commentId)) ?? null;
  }

  async save(comment: Comment): Promise<Comment> {
    this.#comments.set(keyOf(comment.workspaceId, comment.id), comment);
    return comment;
  }

  list(): Comment[] {
    return [...this.#comments.values()];
  }
}
