import type { Comment } from '../../domain/comment';
import {
  NOTIFICATION_ACTOR_NAME_MAX_LENGTH,
  NOTIFICATION_BODY_PREVIEW_MAX_LENGTH,
  Notification,
} from '../../domain/notification';
import { NotificationId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository, NotificationRepository, WorkspaceRepository } from '../ports';

export interface NotifyCommentInput {
  readonly comment: Comment;
  readonly actorName?: string;
}

export type NotifyCommentResult =
  | { readonly status: 'ok'; readonly created: number }
  | { readonly status: 'error'; readonly error: AppError };

export type NotifyComment = (input: NotifyCommentInput) => Promise<NotifyCommentResult>;

export interface NotifyCommentDeps {
  readonly notificationRepository: NotificationRepository;
  readonly membershipRepository: MembershipRepository;
  readonly workspaceRepository: WorkspaceRepository;
  readonly now?: () => Date;
}

export function createNotifyComment(deps: NotifyCommentDeps): NotifyComment {
  return async (input: NotifyCommentInput): Promise<NotifyCommentResult> => {
    try {
      const comment = input.comment;
      const [memberships, workspace] = await Promise.all([
        deps.membershipRepository.listByWorkspace(comment.workspaceId),
        deps.workspaceRepository.findById(comment.workspaceId),
      ]);

      if (workspace === null) {
        return { status: 'ok', created: 0 };
      }

      const now = deps.now === undefined ? new Date() : deps.now();
      const actorName = normalizeActorName(input.actorName, comment.authorId.value);
      const bodyPreview = previewOf(comment.body);
      const notifications = memberships
        .filter((membership) => !membership.userId.equals(comment.authorId))
        .map((membership) =>
          Notification.create({
            id: NotificationId.create(`${comment.id.value}_${membership.userId.value}`),
            type: 'comment',
            recipientId: membership.userId,
            workspaceId: comment.workspaceId,
            workspaceName: workspace.name,
            elementId: comment.elementId,
            commentId: comment.id,
            actorId: comment.authorId,
            actorName,
            bodyPreview,
            createdAt: now,
          }),
        );

      if (notifications.length === 0) {
        return { status: 'ok', created: 0 };
      }

      await deps.notificationRepository.createMany(notifications);
      return { status: 'ok', created: notifications.length };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function normalizeActorName(actorName: string | undefined, fallback: string): string {
  const normalized = typeof actorName === 'string' ? actorName.trim() : '';
  const value = normalized.length === 0 ? fallback : normalized;

  return value.slice(0, NOTIFICATION_ACTOR_NAME_MAX_LENGTH);
}

function previewOf(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, NOTIFICATION_BODY_PREVIEW_MAX_LENGTH);
}
