import type { Membership } from '../../domain/membership';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export interface CreateOwnerMembershipInput {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

export type CreateOwnerMembershipResult =
  | { readonly status: 'ok'; readonly membership: Membership }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateOwnerMembership = (
  input: CreateOwnerMembershipInput,
) => Promise<CreateOwnerMembershipResult>;

export function createCreateOwnerMembership(
  membershipRepository: MembershipRepository,
): CreateOwnerMembership {
  return async (input: CreateOwnerMembershipInput): Promise<CreateOwnerMembershipResult> => {
    try {
      const membership = await membershipRepository.create({
        userId: input.userId,
        workspaceId: input.workspaceId,
        role: 'owner',
      });
      return { status: 'ok', membership };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
