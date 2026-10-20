import type { CommentServices } from '../../application/comment-services';
import { createCreateComment, createResolveComment } from '../../application/commands';
import { createListComments } from '../../application/queries';
import { CommentId } from '../../domain/shared';
import { createFirebaseCommentRepository } from '../../infrastructure/firebase/firebase-comment-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export function createCommentServices(): CommentServices {
  const repository = createFirebaseCommentRepository(getFirebaseFirestore());

  return {
    listComments: createListComments(repository),
    createComment: createCreateComment({
      repository,
      generateId: () => CommentId.create(crypto.randomUUID()),
    }),
    resolveComment: createResolveComment({ repository }),
  };
}
