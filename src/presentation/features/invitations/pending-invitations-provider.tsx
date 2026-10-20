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
import type {
  AcceptInvitationById,
  RefreshUser,
  SendEmailVerification,
} from '../../../application/commands';
import type {
  ListPendingInvitationsForUser,
  WatchPendingInvitationsForUser,
} from '../../../application/queries';
import type { Invitation } from '../../../domain/invitation';
import { UserId } from '../../../domain/shared';
import { ERROR_CODES, toAppError } from '../../../shared/errors';
import { localizeMessage, useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import {
  describeAcceptInvitationError,
  describePendingInvitationsError,
} from './invitation-error-messages';
import { InvitationNotice } from './components/invitation-notice';

export type PendingInvitationsLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PendingInvitationsContextValue {
  readonly status: PendingInvitationsLoadStatus;
  readonly invitations: readonly Invitation[];
  readonly unreadCount: number;
  readonly loadError: string | null;
  readonly actionError: string | null;
  readonly needsVerification: boolean;
  readonly verificationSent: boolean;
  readonly acceptingId: string | null;
  readonly accept: (invitation: Invitation) => void;
  readonly dismiss: (invitation: Invitation) => void;
  readonly retry: () => void;
  readonly sendVerification: () => void;
}

const PendingInvitationsContext = createContext<PendingInvitationsContextValue | null>(null);

export interface PendingInvitationsProviderProps {
  readonly listPendingInvitationsForUser?: ListPendingInvitationsForUser;
  readonly watchPendingInvitationsForUser?: WatchPendingInvitationsForUser;
  readonly acceptInvitationById?: AcceptInvitationById;
  readonly sendEmailVerification?: SendEmailVerification;
  readonly refreshUser?: RefreshUser;
}

export function PendingInvitationsProvider({
  listPendingInvitationsForUser,
  watchPendingInvitationsForUser,
  acceptInvitationById,
  sendEmailVerification,
  refreshUser,
}: PendingInvitationsProviderProps): ReactNode {
  const session = useSession();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const userEmail = session.status === 'authenticated' ? session.user.email : null;
  const userId = session.status === 'authenticated' ? session.user.uid : null;
  const userEmailVerified = session.status === 'authenticated' && session.user.emailVerified;

  const [status, setStatus] = useState<PendingInvitationsLoadStatus>('idle');
  const [invitations, setInvitations] = useState<readonly Invitation[]>([]);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [notice, setNotice] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(!userEmailVerified);
  const [verificationSent, setVerificationSent] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    setNeedsVerification(!userEmailVerified);
  }, [userEmailVerified]);

  useEffect(() => {
    knownIdsRef.current = null;
    setInvitations([]);
    setReadIds(new Set());
    setNotice(null);
    setLoadError(null);
    setActionError(null);
    setVerificationSent(false);
    setStatus('idle');

    if (userEmail === null) {
      return;
    }

    const hasWatch = watchPendingInvitationsForUser !== undefined;
    if (!hasWatch && listPendingInvitationsForUser === undefined) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    setStatus('loading');

    const apply = (next: readonly Invitation[]): void => {
      if (!active) {
        return;
      }

      const nextIds = new Set(next.map((invitation) => invitation.id.value));
      const known = knownIdsRef.current;
      if (known === null) {
        knownIdsRef.current = nextIds;
      } else {
        const arrived = next.find((invitation) => !known.has(invitation.id.value));
        for (const id of nextIds) {
          known.add(id);
        }
        if (arrived !== undefined) {
          setNotice(arrived);
        }
      }

      setInvitations(next);
      setNotice((current) => (current !== null && !nextIds.has(current.id.value) ? null : current));
      setLoadError(null);
      setStatus('ready');
    };

    const fail = (error: Parameters<typeof describePendingInvitationsError>[0]): void => {
      if (!active) {
        return;
      }
      setLoadError(localizeMessage(tRef.current, describePendingInvitationsError(error)));
      setStatus('error');
    };

    if (watchPendingInvitationsForUser !== undefined) {
      unsubscribe = watchPendingInvitationsForUser(userEmail, apply, fail);
    } else if (listPendingInvitationsForUser !== undefined) {
      void (async () => {
        try {
          const result = await listPendingInvitationsForUser(userEmail);
          if (!active) {
            return;
          }
          if (result.status !== 'ok') {
            fail(result.error);
            return;
          }
          apply(result.invitations);
        } catch (error) {
          fail(toAppError(error));
        }
      })();
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [listPendingInvitationsForUser, reloadToken, userEmail, watchPendingInvitationsForUser]);

  const dismiss = useCallback((invitation: Invitation): void => {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(invitation.id.value);
      return next;
    });
    setNotice((current) =>
      current !== null && current.id.value === invitation.id.value ? null : current,
    );
  }, []);

  const accept = useCallback(
    (invitation: Invitation): void => {
      if (
        userEmail === null ||
        userId === null ||
        acceptInvitationById === undefined ||
        acceptingId !== null
      ) {
        return;
      }

      setAcceptingId(invitation.id.value);
      setActionError(null);

      void (async () => {
        try {
          let verified = userEmailVerified;
          if (refreshUser !== undefined) {
            const refreshed = await refreshUser();
            if (refreshed.status === 'ok') {
              verified = refreshed.user.emailVerified;
              setNeedsVerification(!verified);
            }
          }

          const result = await acceptInvitationById({
            invitationId: invitation.id,
            userId: UserId.create(userId),
            userEmail,
            userEmailVerified: verified,
          });

          if (result.status === 'ok') {
            setReadIds((current) => {
              const next = new Set(current);
              next.add(invitation.id.value);
              return next;
            });
            setNotice((current) =>
              current !== null && current.id.value === invitation.id.value ? null : current,
            );
            setInvitations((current) =>
              current.filter((item) => item.id.value !== invitation.id.value),
            );
            navigate(`/workspaces/${result.workspaceId.value}`);
            return;
          }

          if (result.status === 'error') {
            setNeedsVerification(result.error.code === ERROR_CODES.INVITATION_EMAIL_NOT_VERIFIED);
          }

          setActionError(
            result.status === 'invalid-input'
              ? tRef.current('errors.invitationLinkInvalid')
              : localizeMessage(tRef.current, describeAcceptInvitationError(result.error)),
          );
        } catch (error) {
          setActionError(
            localizeMessage(tRef.current, describeAcceptInvitationError(toAppError(error))),
          );
        } finally {
          setAcceptingId(null);
        }
      })();
    },
    [
      acceptInvitationById,
      acceptingId,
      navigate,
      refreshUser,
      userEmail,
      userId,
      userEmailVerified,
    ],
  );

  const sendVerification = useCallback((): void => {
    if (sendEmailVerification === undefined) {
      return;
    }
    void (async () => {
      const result = await sendEmailVerification();
      if (result.status === 'ok') {
        setVerificationSent(true);
        setActionError(null);
      }
    })();
  }, [sendEmailVerification]);

  const unreadCount = useMemo(
    () => invitations.filter((invitation) => !readIds.has(invitation.id.value)).length,
    [invitations, readIds],
  );

  const value = useMemo<PendingInvitationsContextValue>(
    () => ({
      status,
      invitations,
      unreadCount,
      loadError,
      actionError,
      needsVerification,
      verificationSent,
      acceptingId,
      accept,
      dismiss,
      retry: () => setReloadToken((token) => token + 1),
      sendVerification,
    }),
    [
      accept,
      acceptingId,
      actionError,
      dismiss,
      invitations,
      loadError,
      needsVerification,
      sendVerification,
      status,
      unreadCount,
      verificationSent,
    ],
  );

  return (
    <PendingInvitationsContext.Provider value={value}>
      <Outlet />
      {notice === null ? null : (
        <InvitationNotice
          invitation={notice}
          accepting={acceptingId === notice.id.value}
          onAccept={() => accept(notice)}
          onDismiss={() => dismiss(notice)}
        />
      )}
    </PendingInvitationsContext.Provider>
  );
}

export function usePendingInvitations(): PendingInvitationsContextValue {
  const value = useContext(PendingInvitationsContext);

  if (value === null) {
    throw new Error('usePendingInvitations must be used within a PendingInvitationsProvider.');
  }

  return value;
}
