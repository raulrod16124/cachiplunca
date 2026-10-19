import type { InvitationId, UserId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { InvitationRepository, MembershipRepository } from '../ports';
import { acceptInvitationRecord, type AcceptInvitationResult } from './accept-invitation';

export interface AcceptInvitationByIdInput {
  readonly invitationId: InvitationId;
  readonly userId: UserId;
  readonly userEmail: string;
  readonly userEmailVerified: boolean;
}

export type AcceptInvitationById = (
  input: AcceptInvitationByIdInput,
) => Promise<AcceptInvitationResult>;

export interface AcceptInvitationByIdDeps {
  readonly invitationRepository: InvitationRepository;
  readonly membershipRepository: MembershipRepository;
  readonly now?: () => Date;
}

/**
 * Accepts an invitation discovered from the signed-in user's pending list, so
 * access can be granted even when the original link was lost. The invitation is
 * re-validated server-side by Firestore rules (email, role, status, expiry).
 */
export function createAcceptInvitationById(deps: AcceptInvitationByIdDeps): AcceptInvitationById {
  return async (input: AcceptInvitationByIdInput): Promise<AcceptInvitationResult> => {
    try {
      const invitation = await deps.invitationRepository.findById(input.invitationId);
      if (invitation === null) {
        return {
          status: 'error',
          error: invalidInvitationError(),
        };
      }

      return await acceptInvitationRecord(deps, invitation, input);
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function invalidInvitationError(): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.INVITATION_INVALID,
    'This invitation is invalid or already used.',
  );
}
