import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { MembershipCreateInput, MembershipRepository } from '../../application/ports';
import { Membership, type MembershipRole } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromMembershipDocument, toMembershipDocument } from './firebase-membership-mapper';

const MEMBERSHIPS_COLLECTION = 'memberships';

export function createFirebaseMembershipRepository(db: Firestore): MembershipRepository {
  const membershipsCollection = collection(db, MEMBERSHIPS_COLLECTION);
  const membershipRef = (userId: UserId, workspaceId: WorkspaceId) =>
    doc(membershipsCollection, membershipDocumentId(userId, workspaceId));

  async function findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<Membership | null> {
    const snapshot = await withMappedErrors(() => getDoc(membershipRef(userId, workspaceId)));
    if (!snapshot.exists()) {
      return null;
    }
    return readMembership(snapshot.data());
  }

  return {
    async create(input: MembershipCreateInput): Promise<Membership> {
      const membership = buildMembership(() =>
        Membership.create({
          userId: input.userId,
          workspaceId: input.workspaceId,
          role: input.role,
        }),
      );

      const reference = membershipRef(input.userId, input.workspaceId);
      const existing = await withMappedErrors(() => getDoc(reference));
      if (existing.exists()) {
        throw conflictError(input.userId, input.workspaceId);
      }

      await withMappedErrors(() =>
        setDoc(reference, toMembershipDocument(membership, input.invitationId)),
      );
      return membership;
    },

    findByUserAndWorkspace,

    async listByWorkspace(workspaceId: WorkspaceId): Promise<Membership[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(query(membershipsCollection, where('workspaceId', '==', workspaceId.value))),
      );
      return snapshot.docs.map((document) => readMembership(document.data()));
    },

    async listByUser(userId: UserId): Promise<Membership[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(query(membershipsCollection, where('userId', '==', userId.value))),
      );
      return snapshot.docs.map((document) => readMembership(document.data()));
    },

    async updateRole(
      userId: UserId,
      workspaceId: WorkspaceId,
      role: MembershipRole,
    ): Promise<Membership> {
      const current = await findByUserAndWorkspace(userId, workspaceId);
      if (current === null) {
        throw notFoundError(userId, workspaceId);
      }

      const updated = buildMembership(() => current.updateRole(role));
      await withMappedErrors(() =>
        updateDoc(membershipRef(userId, workspaceId), {
          role: updated.role,
          updatedAt: updated.updatedAt,
        }),
      );
      return updated;
    },

    async delete(userId: UserId, workspaceId: WorkspaceId): Promise<void> {
      const current = await findByUserAndWorkspace(userId, workspaceId);
      if (current === null) {
        throw notFoundError(userId, workspaceId);
      }
      await withMappedErrors(() => deleteDoc(membershipRef(userId, workspaceId)));
    },
  };
}

function membershipDocumentId(userId: UserId, workspaceId: WorkspaceId): string {
  return `${workspaceId.value}_${userId.value}`;
}

function buildMembership(build: () => Membership): Membership {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function readMembership(data: unknown): Membership {
  return buildMembership(() => fromMembershipDocument(data));
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
