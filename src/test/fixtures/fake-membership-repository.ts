import type { MembershipCreateInput, MembershipRepository } from '../../application/ports';
import { Membership, type MembershipRole } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';

export class FakeMembershipRepository implements MembershipRepository {
  #memberships = new Map<string, Membership>();

  async create(input: MembershipCreateInput): Promise<Membership> {
    const key = membershipKey(input.userId, input.workspaceId);
    if (this.#memberships.has(key)) {
      throw conflictError(input.userId, input.workspaceId);
    }

    const membership = buildMembership(() =>
      Membership.create({
        userId: input.userId,
        workspaceId: input.workspaceId,
        role: input.role,
      }),
    );

    this.#memberships.set(key, membership);
    return membership;
  }

  async findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<Membership | null> {
    return this.#memberships.get(membershipKey(userId, workspaceId)) ?? null;
  }

  async listByWorkspace(workspaceId: WorkspaceId): Promise<Membership[]> {
    return [...this.#memberships.values()].filter((membership) =>
      membership.workspaceId.equals(workspaceId),
    );
  }

  async listByUser(userId: UserId): Promise<Membership[]> {
    return [...this.#memberships.values()].filter((membership) => membership.userId.equals(userId));
  }

  async updateRole(
    userId: UserId,
    workspaceId: WorkspaceId,
    role: MembershipRole,
  ): Promise<Membership> {
    const key = membershipKey(userId, workspaceId);
    const current = this.#memberships.get(key);
    if (current === undefined) {
      throw notFoundError(userId, workspaceId);
    }

    const updated = buildMembership(() => current.updateRole(role));
    this.#memberships.set(key, updated);
    return updated;
  }

  async delete(userId: UserId, workspaceId: WorkspaceId): Promise<void> {
    if (!this.#memberships.delete(membershipKey(userId, workspaceId))) {
      throw notFoundError(userId, workspaceId);
    }
  }
}

function membershipKey(userId: UserId, workspaceId: WorkspaceId): string {
  return `${userId.value}:${workspaceId.value}`;
}

function buildMembership(build: () => Membership): Membership {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Invalid membership input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function conflictError(userId: UserId, workspaceId: WorkspaceId): AppError {
  return createAppError(
    'conflict',
    ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS,
    'The user is already a member of the workspace.',
    {
      details: { userId: userId.value, workspaceId: workspaceId.value },
    },
  );
}

function notFoundError(userId: UserId, workspaceId: WorkspaceId): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The membership does not exist.',
    {
      details: { userId: userId.value, workspaceId: workspaceId.value },
    },
  );
}
