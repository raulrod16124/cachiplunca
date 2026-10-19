import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { InvitationRepository } from '../../application/ports';
import { Invitation, type InvitationStatus } from '../../domain/invitation';
import { InvitationId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromInvitationDocument, toInvitationDocument } from './firebase-invitation-mapper';

const INVITATIONS_COLLECTION = 'invitations';

export function createFirebaseInvitationRepository(db: Firestore): InvitationRepository {
  const invitationsCollection = collection(db, INVITATIONS_COLLECTION);
  const invitationRef = (id: InvitationId) => doc(invitationsCollection, id.value);

  async function listPendingByWorkspace(workspaceId: WorkspaceId): Promise<Invitation[]> {
    const snapshot = await withMappedErrors(() =>
      getDocs(
        query(
          invitationsCollection,
          where('workspaceId', '==', workspaceId.value),
          where('status', '==', 'pending'),
        ),
      ),
    );
    return snapshot.docs.map((document) => readInvitation(document.data()));
  }

  async function listPendingByEmail(email: string): Promise<Invitation[]> {
    const normalized = email.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }

    const snapshot = await withMappedErrors(() =>
      getDocs(
        query(
          invitationsCollection,
          where('email', '==', normalized),
          where('status', '==', 'pending'),
        ),
      ),
    );
    return snapshot.docs.map((document) => readInvitation(document.data()));
  }

  return {
    async create(invitation: Invitation): Promise<Invitation> {
      const reference = invitationRef(invitation.id);
      const existing = await withMappedErrors(() => getDoc(reference));
      if (existing.exists()) {
        throw conflictError(invitation.id, 'An invitation with this id already exists.');
      }

      if (invitation.isPending()) {
        const pending = await listPendingByWorkspace(invitation.workspaceId);
        if (pending.some((current) => current.isForEmail(invitation.email))) {
          throw conflictError(
            invitation.id,
            'A pending invitation already exists for this email in the workspace.',
          );
        }
      }

      await withMappedErrors(() => setDoc(reference, toInvitationDocument(invitation)));
      return invitation;
    },

    async findById(id: InvitationId): Promise<Invitation | null> {
      const snapshot = await withMappedErrors(() => getDoc(invitationRef(id)));
      if (!snapshot.exists()) {
        return null;
      }
      return readInvitation(snapshot.data());
    },

    async findByTokenHash(tokenHash: string, email?: string): Promise<Invitation | null> {
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (typeof email === 'string' && normalizedEmail.length === 0) {
        return null;
      }
      const constraints =
        normalizedEmail.length > 0
          ? [where('tokenHash', '==', tokenHash), where('email', '==', normalizedEmail)]
          : [where('tokenHash', '==', tokenHash)];
      const snapshot = await withMappedErrors(() =>
        getDocs(query(invitationsCollection, ...constraints)),
      );
      const document = snapshot.docs[0];
      if (document === undefined) {
        return null;
      }
      return readInvitation(document.data());
    },

    listPendingByWorkspace,
    listPendingByEmail,

    async updateStatus(id: InvitationId, status: InvitationStatus): Promise<Invitation> {
      const reference = invitationRef(id);
      const snapshot = await withMappedErrors(() => getDoc(reference));
      if (!snapshot.exists()) {
        throw notFoundError(id);
      }

      const current = readInvitation(snapshot.data());
      const updated = buildInvitation(() => {
        if (status === 'accepted') {
          return current.accept();
        }
        if (status === 'revoked') {
          return current.revoke();
        }
        throw new Error('Unsupported invitation status transition');
      });

      await withMappedErrors(() =>
        updateDoc(reference, {
          status: updated.status,
          updatedAt: updated.updatedAt,
        }),
      );
      return updated;
    },
  };
}

function buildInvitation(build: () => Invitation): Invitation {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function readInvitation(data: unknown): Invitation {
  return buildInvitation(() => fromInvitationDocument(data));
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
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
