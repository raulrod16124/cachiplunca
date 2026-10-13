import { Invitation } from '../../domain/invitation';
import { isValidRole, type MembershipRole } from '../../domain/membership';
import type { InvitationId, UserId, WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import { isValidEmail } from '../../shared/utils';
import type { InvitationRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteMemberInput {
  readonly workspaceId: WorkspaceId;
  readonly email: string;
  readonly role: MembershipRole;
  readonly invitedBy: UserId;
}

export type InviteMemberFieldName = 'email' | 'role';

export type InviteMemberFieldErrors = Partial<Record<InviteMemberFieldName, string>>;

export interface IssuedInvitationToken {
  readonly token: string;
  readonly tokenHash: string;
}

export interface InviteMemberDeps {
  readonly invitationRepository: InvitationRepository;
  readonly generateId: () => InvitationId;
  readonly issueToken: () => Promise<IssuedInvitationToken>;
  readonly now?: () => Date;
  readonly ttlMs?: number;
}

export type InviteMemberResult =
  | { readonly status: 'ok'; readonly invitation: Invitation; readonly token: string }
  | { readonly status: 'invalid-input'; readonly fieldErrors: InviteMemberFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type InviteMember = (input: InviteMemberInput) => Promise<InviteMemberResult>;

export function validateInviteMemberInput(input: InviteMemberInput): InviteMemberFieldErrors {
  const fieldErrors: InviteMemberFieldErrors = {};

  const email = input.email.trim();
  if (email.length === 0) {
    fieldErrors.email = 'Enter the email address to invite.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!isValidRole(input.role)) {
    fieldErrors.role = 'Choose a valid role.';
  }

  return fieldErrors;
}

export function createInviteMember(deps: InviteMemberDeps): InviteMember {
  return async (input: InviteMemberInput): Promise<InviteMemberResult> => {
    const fieldErrors = validateInviteMemberInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    const createdAt = deps.now?.() ?? new Date();
    const expiresAt = new Date(createdAt.getTime() + (deps.ttlMs ?? INVITATION_TTL_MS));

    let token: string;
    let invitation: Invitation;
    try {
      const issued = await deps.issueToken();
      token = issued.token;
      invitation = Invitation.create({
        id: deps.generateId(),
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        tokenHash: issued.tokenHash,
        invitedBy: input.invitedBy,
        expiresAt,
        createdAt,
      });
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }

    try {
      const persisted = await deps.invitationRepository.create(invitation);
      return { status: 'ok', invitation: persisted, token };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
