import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import type { NotificationServices } from '../../../application/notification-services';
import type { Notification } from '../../../domain/notification';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import {
  usePendingInvitations,
  type PendingInvitationsContextValue,
} from '../invitations/pending-invitations-provider';
import { NotificationToast } from './components/notification-toast';
import { notificationHref } from './notification-target';

export type CommentNotificationsLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface NotificationsContextValue {
  readonly invitations: PendingInvitationsContextValue;
  readonly commentsSupported: boolean;
  readonly commentStatus: CommentNotificationsLoadStatus;
  readonly commentNotifications: readonly Notification[];
  readonly commentUnreadCount: number;
  readonly unreadCount: number;
  readonly loadError: string | null;
  readonly actionError: string | null;
  readonly markRead: (notification: Notification) => void;
  readonly retry: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export interface NotificationsProviderProps {
  readonly services?: NotificationServices;
}

export function NotificationsProvider({ services }: NotificationsProviderProps): ReactNode {
  const session = useSession();
  const invitations = usePendingInvitations();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const userId = session.status === 'authenticated' ? session.user.uid : null;
  const [commentStatus, setCommentStatus] = useState<CommentNotificationsLoadStatus>('idle');
  const [commentNotifications, setCommentNotifications] = useState<readonly Notification[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<readonly Notification[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const knownNotificationIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    setActionError(null);
    setAnnouncements([]);
    knownNotificationIdsRef.current = null;
    if (userId === null || services === undefined) {
      setCommentNotifications([]);
      setLoadError(null);
      setCommentStatus('idle');
      return;
    }

    let active = true;
    setCommentStatus('loading');
    setLoadError(null);

    const unsubscribe = services.watchNotificationsForUser(
      userId,
      (notifications) => {
        if (!active) {
          return;
        }

        const nextIds = new Set(notifications.map((notification) => notification.id.value));
        const knownIds = knownNotificationIdsRef.current;

        if (knownIds === null) {
          knownNotificationIdsRef.current = nextIds;
        } else {
          const arrived = notifications
            .filter(
              (notification) => !knownIds.has(notification.id.value) && !notification.isRead(),
            )
            .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

          for (const id of nextIds) {
            knownIds.add(id);
          }

          if (arrived.length > 0) {
            setAnnouncements((current) => {
              const currentIds = new Set(current.map((notification) => notification.id.value));
              const unique = arrived.filter(
                (notification) => !currentIds.has(notification.id.value),
              );

              return unique.length === 0 ? current : [...current, ...unique].slice(-5);
            });
          }
        }

        setCommentNotifications(notifications);
        setLoadError(null);
        setCommentStatus('ready');
      },
      () => {
        if (!active) {
          return;
        }
        setLoadError(tRef.current('notifications.error.generic'));
        setCommentStatus('error');
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadToken, services, userId]);

  const markRead = useCallback(
    (notification: Notification): void => {
      if (services === undefined || notification.isRead()) {
        return;
      }

      const readAt = new Date();
      setCommentNotifications((current) =>
        current.map((entry) => (entry.id.equals(notification.id) ? entry.markRead(readAt) : entry)),
      );
      setAnnouncements((current) => current.filter((entry) => !entry.id.equals(notification.id)));
      setActionError(null);

      void (async () => {
        try {
          const result = await services.markNotificationRead({
            notificationId: notification.id.value,
            recipientId: notification.recipientId.value,
            readAt,
          });
          if (result.status === 'error') {
            setActionError(tRef.current('notifications.error.markRead'));
          }
        } catch {
          setActionError(tRef.current('notifications.error.markRead'));
        }
      })();
    },
    [services],
  );

  const dismissAnnouncement = useCallback((notification: Notification): void => {
    setAnnouncements((current) => current.filter((entry) => !entry.id.equals(notification.id)));
  }, []);

  const openAnnouncement = useCallback(
    (notification: Notification): void => {
      markRead(notification);
      navigate(notificationHref(notification));
    },
    [markRead, navigate],
  );

  const commentUnreadCount = useMemo(
    () => commentNotifications.filter((notification) => !notification.isRead()).length,
    [commentNotifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      invitations,
      commentsSupported: services !== undefined,
      commentStatus,
      commentNotifications,
      commentUnreadCount,
      unreadCount: invitations.unreadCount + commentUnreadCount,
      loadError,
      actionError,
      markRead,
      retry: () => setReloadToken((token) => token + 1),
    }),
    [
      actionError,
      commentNotifications,
      commentStatus,
      commentUnreadCount,
      invitations,
      loadError,
      markRead,
      services,
    ],
  );

  const currentAnnouncement = announcements[0];

  return (
    <NotificationsContext.Provider value={value}>
      <Outlet />
      {currentAnnouncement === undefined ? null : (
        <NotificationToast
          key={currentAnnouncement.id.value}
          notification={currentAnnouncement}
          onOpen={() => {
            openAnnouncement(currentAnnouncement);
          }}
          onDismiss={() => {
            dismissAnnouncement(currentAnnouncement);
          }}
        />
      )}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const value = useContext(NotificationsContext);

  if (value === null) {
    throw new Error('useNotifications must be used within a NotificationsProvider.');
  }

  return value;
}
