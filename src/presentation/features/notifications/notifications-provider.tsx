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
import { Outlet } from 'react-router-dom';
import type { NotificationServices } from '../../../application/notification-services';
import type { Notification } from '../../../domain/notification';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import {
  usePendingInvitations,
  type PendingInvitationsContextValue,
} from '../invitations/pending-invitations-provider';

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
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const userId = session.status === 'authenticated' ? session.user.uid : null;
  const [commentStatus, setCommentStatus] = useState<CommentNotificationsLoadStatus>('idle');
  const [commentNotifications, setCommentNotifications] = useState<readonly Notification[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setActionError(null);
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

  return (
    <NotificationsContext.Provider value={value}>
      <Outlet />
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
