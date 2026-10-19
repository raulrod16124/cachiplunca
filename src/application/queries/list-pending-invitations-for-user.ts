import type { Invitation } from '../../domain/invitation';
import { toAppError, type AppError } from '../../shared/errors';
import type { InvitationRepository } from '../ports';
import { sortPendingInvitations } from './list-pending-invitations';

export type ListPendingInvitationsForUserResult =
  | { readonly status: 'ok'; readonly invitations: Invitation[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListPendingInvitationsForUser = (
  email: string,
) => Promise<ListPendingInvitationsForUserResult>;

export function createListPendingInvitationsForUser(
  invitationRepository: InvitationRepository,
): ListPendingInvitationsForUser {
  return async (email: string): Promise<ListPendingInvitationsForUserResult> => {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalized.length === 0) {
      return { status: 'ok', invitations: [] };
    }

    try {
      const invitations = await invitationRepository.listPendingByEmail(normalized);
      return { status: 'ok', invitations: sortPendingInvitations(invitations) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
