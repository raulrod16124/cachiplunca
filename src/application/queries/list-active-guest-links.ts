import { can } from '../../domain/membership';
import type { GuestLink } from '../../domain/guest-link';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { GuestLinkRepository, MembershipRepository } from '../ports';
import { toValidationAppError } from '../commands/to-validation-app-error';

export interface ListActiveGuestLinksInput {
  readonly workspaceId: string;
  readonly userId: string;
}

export type ListActiveGuestLinksResult =
  | { readonly status: 'ok'; readonly links: GuestLink[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListActiveGuestLinks = (
  input: ListActiveGuestLinksInput,
) => Promise<ListActiveGuestLinksResult>;

export interface ListActiveGuestLinksDeps {
  readonly guestLinkRepository: GuestLinkRepository;
  readonly membershipRepository: MembershipRepository;
}

export function createListActiveGuestLinks(deps: ListActiveGuestLinksDeps): ListActiveGuestLinks {
  return async (input: ListActiveGuestLinksInput): Promise<ListActiveGuestLinksResult> => {
    try {
      const workspaceId = WorkspaceId.create(input.workspaceId);
      const userId = UserId.create(input.userId);
      const actor = await deps.membershipRepository.findByUserAndWorkspace(userId, workspaceId);

      if (actor === null || !can(actor.role, 'workspace:update')) {
        return { status: 'error', error: forbiddenError(workspaceId, userId) };
      }

      const links = await deps.guestLinkRepository.listActiveByWorkspace(workspaceId);
      return { status: 'ok', links };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}

function forbiddenError(workspaceId: WorkspaceId, userId: UserId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to view the links of this workspace.',
    {
      details: {
        workspaceId: workspaceId.value,
        userId: userId.value,
      },
    },
  );
}
