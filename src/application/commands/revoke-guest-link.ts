import { can } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { GuestLinkRepository, MembershipRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export interface RevokeGuestLinkInput {
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly tokenHash: string;
}

export type RevokeGuestLinkFieldName = 'workspaceId' | 'actorUserId' | 'tokenHash';

export type RevokeGuestLinkFieldErrors = Partial<Record<RevokeGuestLinkFieldName, string>>;

export type RevokeGuestLinkResult =
  | { readonly status: 'ok' }
  | { readonly status: 'invalid-input'; readonly fieldErrors: RevokeGuestLinkFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type RevokeGuestLink = (input: RevokeGuestLinkInput) => Promise<RevokeGuestLinkResult>;

export interface RevokeGuestLinkDeps {
  readonly guestLinkRepository: GuestLinkRepository;
  readonly membershipRepository: MembershipRepository;
}

export function validateRevokeGuestLinkInput(
  input: RevokeGuestLinkInput,
): RevokeGuestLinkFieldErrors {
  const fieldErrors: RevokeGuestLinkFieldErrors = {};

  if (input.workspaceId.trim().length === 0) {
    fieldErrors.workspaceId = 'Enter a workspace id.';
  }

  if (input.actorUserId.trim().length === 0) {
    fieldErrors.actorUserId = 'Enter a user id.';
  }

  if (input.tokenHash.trim().length === 0) {
    fieldErrors.tokenHash = 'Enter a view link token.';
  }

  return fieldErrors;
}

export function createRevokeGuestLink(deps: RevokeGuestLinkDeps): RevokeGuestLink {
  return async (input: RevokeGuestLinkInput): Promise<RevokeGuestLinkResult> => {
    const fieldErrors = validateRevokeGuestLinkInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    const workspaceId = WorkspaceId.create(input.workspaceId);
    const actorUserId = UserId.create(input.actorUserId);

    try {
      const actor = await deps.membershipRepository.findByUserAndWorkspace(
        actorUserId,
        workspaceId,
      );

      if (actor === null || !can(actor.role, 'workspace:update')) {
        return { status: 'error', error: forbiddenError(workspaceId, actorUserId) };
      }

      const link = await deps.guestLinkRepository.findByTokenHash(input.tokenHash);
      if (link === null || !link.workspaceId.equals(workspaceId)) {
        return { status: 'error', error: notFoundError(input.tokenHash) };
      }

      if (link.isActive()) {
        await deps.guestLinkRepository.revoke(link.tokenHash);
      }

      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}

function forbiddenError(workspaceId: WorkspaceId, actorUserId: UserId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to revoke the view link for this workspace.',
    {
      details: {
        workspaceId: workspaceId.value,
        actorUserId: actorUserId.value,
      },
    },
  );
}

function notFoundError(tokenHash: string): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The view link does not exist.',
    {
      details: { tokenHash },
    },
  );
}
