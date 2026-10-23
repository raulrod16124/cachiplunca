import {
  createMarkNotificationRead,
  createNotifyComment,
  createWatchNotificationsForUser,
} from '../../application';
import type { NotificationServices } from '../../application/notification-services';
import type {
  MembershipRepository,
  NotificationRepository,
  WorkspaceRepository,
} from '../../application/ports';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';
import { createFirebaseNotificationRepository } from '../../infrastructure/firebase/firebase-notification-repository';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export function createNotificationServices(): NotificationServices {
  const db = getFirebaseFirestore();
  const notificationRepository: NotificationRepository = createFirebaseNotificationRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);
  const workspaceRepository: WorkspaceRepository = createFirebaseWorkspaceRepository(db);

  return {
    notifyComment: createNotifyComment({
      notificationRepository,
      membershipRepository,
      workspaceRepository,
    }),
    watchNotificationsForUser: createWatchNotificationsForUser(notificationRepository),
    markNotificationRead: createMarkNotificationRead({ repository: notificationRepository }),
  };
}
