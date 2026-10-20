import type { Comment } from '../../domain/comment';

/**
 * Counts unresolved comments per element. Resolved comments stay in the
 * history but no longer surface on the board.
 */
export function countUnresolvedCommentsByElement(
  comments: readonly Comment[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const comment of comments) {
    if (comment.isResolved()) {
      continue;
    }

    const elementId = comment.elementId.value;
    counts.set(elementId, (counts.get(elementId) ?? 0) + 1);
  }

  return counts;
}
