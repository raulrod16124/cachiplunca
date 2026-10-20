import { GuestLink } from '../../domain/guest-link';
import { can } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { GuestLinkRepository, MembershipRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export interface IssuedGuestLinkToken {
  readonly token: string;
  readonly tokenHash: string;
}

export interface CreateGuestLinkInput {
  readonly workspaceId: string;
  readonly actorUserId: string;
}

export type CreateGuestLinkFieldName = 'workspaceId' | 'actorUserId';

export type CreateGuestLinkFieldErrors = Partial<Record<CreateGuestLinkFieldName, string>>;

export type CreateGuestLinkResult =
  | { readonly status: 'ok'; readonly link: GuestLink; readonly token: string }
  | { readonly status: 'invalid-input'; readonly fieldErrors: CreateGuestLinkFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateGuestLink = (input: CreateGuestLinkInput) => Promise<CreateGuestLinkResult>;

export interface CreateGuestLinkDeps {
  readonly guestLinkRepository: GuestLinkRepository;
  readonly membershipRepository: MembershipRepository;
  readonly issueToken: () => Promise<IssuedGuestLinkToken>;
  readonly now?: () => Date;
}

export function validateCreateGuestLinkInput(
  input: CreateGuestLinkInput,
): CreateGuestLinkFieldErrors {
  const fieldErrors: CreateGuestLinkFieldErrors = {};

  if (input.workspaceId.trim().length === 0) {
    fieldErrors.workspaceId = 'Enter a workspace id.';
  }

  if (input.actorUserId.trim().length === 0) {
    fieldErrors.actorUserId = 'Enter a user id.';
  }

  return fieldErrors;
}

export function createCreateGuestLink(deps: CreateGuestLinkDeps): CreateGuestLink {
  return async (input: CreateGuestLinkInput): Promise<CreateGuestLinkResult> => {
    const fieldErrors = validateCreateGuestLinkInput(input);
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

      const issued = await deps.issueToken();

      for (const active of await deps.guestLinkRepository.listActiveByWorkspace(workspaceId)) {
        await deps.guestLinkRepository.revoke(active.tokenHash);
      }

      const link = GuestLink.create({
        tokenHash: issued.tokenHash,
        workspaceId,
        createdBy: actorUserId,
        createdAt: deps.now === undefined ? undefined : deps.now(),
      });
      const saved = await deps.guestLinkRepository.create(link);

      return { status: 'ok', link: saved, token: issued.token };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}

function forbiddenError(workspaceId: WorkspaceId, actorUserId: UserId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to create a view link for this workspace.',
    {
      details: {
        workspaceId: workspaceId.value,
        actorUserId: actorUserId.value,
      },
    },
  );
}
