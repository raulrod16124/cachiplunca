import { can, isValidRole, type Membership, type MembershipRole } from '../../domain/membership';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export interface ChangeMemberRoleInput {
  readonly workspaceId: WorkspaceId;
  readonly actorUserId: UserId;
  readonly targetUserId: UserId;
  readonly role: MembershipRole;
}

export type ChangeMemberRoleFieldName = 'role';

export type ChangeMemberRoleFieldErrors = Partial<Record<ChangeMemberRoleFieldName, string>>;

export type ChangeMemberRoleResult =
  | { readonly status: 'ok'; readonly membership: Membership }
  | { readonly status: 'invalid-input'; readonly fieldErrors: ChangeMemberRoleFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type ChangeMemberRole = (input: ChangeMemberRoleInput) => Promise<ChangeMemberRoleResult>;

export function validateChangeMemberRoleInput(
  input: ChangeMemberRoleInput,
): ChangeMemberRoleFieldErrors {
  const fieldErrors: ChangeMemberRoleFieldErrors = {};

  if (!isValidRole(input.role)) {
    fieldErrors.role = 'Choose a valid role.';
  }

  return fieldErrors;
}

export function createChangeMemberRole(
  membershipRepository: MembershipRepository,
): ChangeMemberRole {
  return async (input: ChangeMemberRoleInput): Promise<ChangeMemberRoleResult> => {
    const fieldErrors = validateChangeMemberRoleInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const actor = await membershipRepository.findByUserAndWorkspace(
        input.actorUserId,
        input.workspaceId,
      );

      if (actor === null || !can(actor.role, 'member:update-role')) {
        return { status: 'error', error: forbiddenError(input) };
      }

      const membership = await membershipRepository.updateRole(
        input.targetUserId,
        input.workspaceId,
        input.role,
      );

      return { status: 'ok', membership };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function forbiddenError(input: ChangeMemberRoleInput): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to change member roles in this workspace.',
    {
      details: {
        workspaceId: input.workspaceId.value,
        actorUserId: input.actorUserId.value,
      },
    },
  );
}
