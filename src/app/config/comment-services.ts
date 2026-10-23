import type { CommentServices } from '../../application/comment-services';
import {
  createCreateComment,
  createEditComment,
  createResolveComment,
} from '../../application/commands';
import { createListComments, createListWorkspaceComments } from '../../application/queries';
import type { RecordWorkspaceActivity } from '../../application/services/record-activity';
import type { NotifyComment } from '../../application/services/notify-comment';
import { CommentId } from '../../domain/shared';
import { createFirebaseCommentRepository } from '../../infrastructure/firebase/firebase-comment-repository';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface CommentServicesDeps {
  readonly notifyComment?: NotifyComment;
}

export function createCommentServices(deps: CommentServicesDeps = {}): CommentServices {
  const db = getFirebaseFirestore();
  const repository = createFirebaseCommentRepository(db);
  const workspaceRepository = createFirebaseWorkspaceRepository(db);
  const recordActivity: RecordWorkspaceActivity = async (workspaceId, at) => {
    await workspaceRepository.touchActivity(workspaceId, at);
  };

  return {
    listWorkspaceComments: createListWorkspaceComments(repository),
    listComments: createListComments(repository),
    createComment: createCreateComment({
      repository,
      generateId: () => CommentId.create(crypto.randomUUID()),
      recordActivity,
      notifyComment: deps.notifyComment,
    }),
    editComment: createEditComment({ repository }),
    resolveComment: createResolveComment({ repository, recordActivity }),
  };
}
