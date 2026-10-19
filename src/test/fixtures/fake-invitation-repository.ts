import type { InvitationRepository } from '../../application/ports';
import type { Invitation, InvitationStatus } from '../../domain/invitation';
import type { InvitationId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';

export class FakeInvitationRepository implements InvitationRepository {
  #invitations = new Map<string, Invitation>();

  async create(invitation: Invitation): Promise<Invitation> {
    const id = invitation.id.value;
    if (this.#invitations.has(id)) {
      throw conflictError(invitation.id, 'An invitation with this id already exists.');
    }

    if (invitation.isPending() && this.#hasPending(invitation.workspaceId, invitation.email)) {
      throw conflictError(
        invitation.id,
        'A pending invitation already exists for this email in the workspace.',
      );
    }

    this.#invitations.set(id, invitation);
    return invitation;
  }

  async findById(id: InvitationId): Promise<Invitation | null> {
    return this.#invitations.get(id.value) ?? null;
  }

  async findByTokenHash(tokenHash: string, email?: string): Promise<Invitation | null> {
    if (email !== undefined && email.trim().length === 0) {
      return null;
    }
    for (const invitation of this.#invitations.values()) {
      if (
        invitation.tokenHash === tokenHash &&
        (email === undefined || invitation.isForEmail(email))
      ) {
        return invitation;
      }
    }
    return null;
  }

  async listPendingByWorkspace(workspaceId: WorkspaceId): Promise<Invitation[]> {
    return [...this.#invitations.values()].filter(
      (invitation) => invitation.isPending() && invitation.workspaceId.equals(workspaceId),
    );
  }

  async listPendingByEmail(email: string): Promise<Invitation[]> {
    return [...this.#invitations.values()].filter(
      (invitation) => invitation.isPending() && invitation.isForEmail(email),
    );
  }

  async updateStatus(id: InvitationId, status: InvitationStatus): Promise<Invitation> {
    const current = this.#invitations.get(id.value);
    if (current === undefined) {
      throw notFoundError(id);
    }

    const updated = buildInvitation(() => {
      if (status === 'accepted') {
        return current.accept();
      }
      if (status === 'revoked') {
        return current.revoke();
      }
      throw new Error('Unsupported invitation status transition');
    });

    this.#invitations.set(id.value, updated);
    return updated;
  }

  #hasPending(workspaceId: WorkspaceId, email: string): boolean {
    for (const invitation of this.#invitations.values()) {
      if (
        invitation.isPending() &&
        invitation.workspaceId.equals(workspaceId) &&
        invitation.isForEmail(email)
      ) {
        return true;
      }
    }
    return false;
  }
}

function buildInvitation(build: () => Invitation): Invitation {
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
      : 'Invalid invitation input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function conflictError(id: InvitationId, message: string): AppError {
  return createAppError('conflict', ERROR_CODES.INVITATION_ALREADY_EXISTS, message, {
    details: { invitationId: id.value },
  });
}

function notFoundError(id: InvitationId): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The invitation does not exist.',
    {
      details: { invitationId: id.value },
    },
  );
}
