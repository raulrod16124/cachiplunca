import type { Invitation } from '../../domain/invitation';
import { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { InvitationRepository } from '../ports';

export type ListPendingInvitationsResult =
  | { readonly status: 'ok'; readonly invitations: Invitation[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListPendingInvitations = (workspaceId: string) => Promise<ListPendingInvitationsResult>;

export function sortPendingInvitations(invitations: readonly Invitation[]): Invitation[] {
  return [...invitations].sort(comparePendingInvitations);
}

function comparePendingInvitations(a: Invitation, b: Invitation): number {
  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.id.value === b.id.value) {
    return 0;
  }
  return a.id.value < b.id.value ? -1 : 1;
}

export function createListPendingInvitations(
  invitationRepository: InvitationRepository,
): ListPendingInvitations {
  return async (workspaceId: string): Promise<ListPendingInvitationsResult> => {
    try {
      const invitations = await invitationRepository.listPendingByWorkspace(
        WorkspaceId.create(workspaceId),
      );
      return { status: 'ok', invitations: sortPendingInvitations(invitations) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
