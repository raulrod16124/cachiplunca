import type { Invitation } from '../../domain/invitation';
import type { MembershipRole } from '../../domain/membership';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { InvitationRepository, MembershipRepository } from '../ports';

export interface AcceptInvitationInput {
  readonly token: string;
  readonly userId: UserId;
  readonly userEmail: string;
}

export type AcceptInvitationFieldName = 'token';

export type AcceptInvitationFieldErrors = Partial<Record<AcceptInvitationFieldName, string>>;

export type AcceptInvitationResult =
  | { readonly status: 'ok'; readonly workspaceId: WorkspaceId; readonly role: MembershipRole }
  | { readonly status: 'invalid-input'; readonly fieldErrors: AcceptInvitationFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type AcceptInvitation = (input: AcceptInvitationInput) => Promise<AcceptInvitationResult>;

export interface AcceptInvitationDeps {
  readonly invitationRepository: InvitationRepository;
  readonly membershipRepository: MembershipRepository;
  readonly hashToken: (token: string) => Promise<string>;
  readonly now?: () => Date;
}

export interface InvitationAcceptanceDeps {
  readonly invitationRepository: InvitationRepository;
  readonly membershipRepository: MembershipRepository;
  readonly now?: () => Date;
}

export function validateAcceptInvitationInput(
  input: AcceptInvitationInput,
): AcceptInvitationFieldErrors {
  const fieldErrors: AcceptInvitationFieldErrors = {};
  if (typeof input.token !== 'string' || input.token.trim().length === 0) {
    fieldErrors.token = 'This invitation link is missing its token.';
  }
  return fieldErrors;
}

export function createAcceptInvitation(deps: AcceptInvitationDeps): AcceptInvitation {
  return async (input: AcceptInvitationInput): Promise<AcceptInvitationResult> => {
    const fieldErrors = validateAcceptInvitationInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const tokenHash = await deps.hashToken(input.token);
      const invitation = await deps.invitationRepository.findByTokenHash(tokenHash);

      if (invitation === null) {
        return { status: 'error', error: invalidInvitationError() };
      }

      return await acceptInvitationRecord(deps, invitation, input);
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

/**
 * Grants workspace access for an invitation that has already been resolved.
 * Shared by the token link flow and the pending-invitations list so both paths
 * enforce exactly the same expiry/email/membership/rollback rules.
 */
export async function acceptInvitationRecord(
  deps: InvitationAcceptanceDeps,
  invitation: Invitation,
  input: { readonly userId: UserId; readonly userEmail: string },
): Promise<AcceptInvitationResult> {
  if (!invitation.isPending()) {
    return { status: 'error', error: invalidInvitationError() };
  }

  const now = deps.now?.() ?? new Date();
  if (invitation.isExpired(now)) {
    return { status: 'error', error: expiredInvitationError() };
  }

  const email = typeof input.userEmail === 'string' ? input.userEmail.trim() : '';
  if (email.length === 0 || !invitation.isForEmail(email)) {
    return { status: 'error', error: emailMismatchError() };
  }

  try {
    const membership = await deps.membershipRepository.create({
      userId: input.userId,
      workspaceId: invitation.workspaceId,
      role: invitation.role,
      invitationId: invitation.id,
    });

    try {
      await deps.invitationRepository.updateStatus(invitation.id, 'accepted');
    } catch (error) {
      return {
        status: 'error',
        error: await rollbackMembership(deps, input.userId, membership, error),
      };
    }

    return { status: 'ok', workspaceId: membership.workspaceId, role: membership.role };
  } catch (error) {
    return { status: 'error', error: toAppError(error) };
  }
}

async function rollbackMembership(
  deps: InvitationAcceptanceDeps,
  userId: UserId,
  membership: { readonly workspaceId: WorkspaceId },
  error: unknown,
): Promise<AppError> {
  try {
    await deps.membershipRepository.delete(userId, membership.workspaceId);
  } catch (compensationError) {
    return annotateCompensationFailure(toAppError(error), compensationError);
  }
  return toAppError(error);
}

function invalidInvitationError(): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.INVITATION_INVALID,
    'This invitation link is invalid or already used.',
  );
}

function expiredInvitationError(): AppError {
  return createAppError(
    'validation',
    ERROR_CODES.INVITATION_EXPIRED,
    'This invitation has expired. Ask for a new one.',
  );
}

function emailMismatchError(): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.INVITATION_EMAIL_MISMATCH,
    'This invitation was issued for a different email address.',
  );
}

function annotateCompensationFailure(error: AppError, cause: unknown): AppError {
  return createAppError(error.kind, error.code, error.message, {
    details: { ...error.details, membershipRollbackFailed: true },
    cause,
  });
}
