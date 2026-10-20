import type { Invitation } from '../../domain/invitation';
import { toAppError, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import type { InvitationRepository } from '../ports';
import { sortPendingInvitations } from './list-pending-invitations';

export type WatchPendingInvitationsForUserListener = (invitations: readonly Invitation[]) => void;

export type WatchPendingInvitationsForUserErrorListener = (error: AppError) => void;

export type WatchPendingInvitationsForUser = (
  email: string,
  listener: WatchPendingInvitationsForUserListener,
  onError?: WatchPendingInvitationsForUserErrorListener,
) => Unsubscribe;

export function createWatchPendingInvitationsForUser(
  invitationRepository: InvitationRepository,
): WatchPendingInvitationsForUser {
  return (
    email: string,
    listener: WatchPendingInvitationsForUserListener,
    onError?: WatchPendingInvitationsForUserErrorListener,
  ): Unsubscribe => {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalized.length === 0) {
      listener([]);
      return () => undefined;
    }

    return invitationRepository.watchPendingByEmail(
      normalized,
      (invitations) => listener(sortPendingInvitations(invitations)),
      (error) => onError?.(toAppError(error)),
    );
  };
}
