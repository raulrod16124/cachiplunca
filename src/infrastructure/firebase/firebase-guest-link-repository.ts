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
import type { GuestLinkRepository, GuestSessionInput } from '../../application/ports';
import { GuestLink } from '../../domain/guest-link';
import { WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromGuestLinkDocument, toGuestLinkDocument } from './firebase-guest-link-mapper';

const GUEST_LINKS_COLLECTION = 'guest_links';
const GUEST_SESSIONS_COLLECTION = 'guest_sessions';

export function createFirebaseGuestLinkRepository(db: Firestore): GuestLinkRepository {
  const linksCollection = collection(db, GUEST_LINKS_COLLECTION);
  const linkRef = (tokenHash: string) => doc(linksCollection, tokenHash);

  return {
    async create(link: GuestLink): Promise<GuestLink> {
      const reference = linkRef(link.tokenHash);
      const existing = await withMappedErrors(() => getDoc(reference));
      if (existing.exists()) {
        throw createAppError(
          'conflict',
          ERROR_CODES.VALIDATION_INVALID_INPUT,
          'A view link with this token already exists.',
        );
      }

      await withMappedErrors(() => setDoc(reference, toGuestLinkDocument(link)));
      return link;
    },

    async findByTokenHash(tokenHash: string): Promise<GuestLink | null> {
      const snapshot = await withMappedErrors(() => getDoc(linkRef(tokenHash)));
      if (!snapshot.exists()) {
        return null;
      }
      return readGuestLink(snapshot.id, snapshot.data());
    },

    async listActiveByWorkspace(workspaceId: WorkspaceId): Promise<GuestLink[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(
          query(
            linksCollection,
            where('workspaceId', '==', workspaceId.value),
            where('revokedAt', '==', null),
          ),
        ),
      );
      return snapshot.docs.map((document) => readGuestLink(document.id, document.data()));
    },

    async revoke(tokenHash: string): Promise<GuestLink> {
      const reference = linkRef(tokenHash);
      const snapshot = await withMappedErrors(() => getDoc(reference));
      if (!snapshot.exists()) {
        throw notFoundError(tokenHash);
      }

      const current = readGuestLink(snapshot.id, snapshot.data());
      if (!current.isActive()) {
        return current;
      }

      const revoked = buildGuestLink(() => current.revoke());
      await withMappedErrors(() =>
        updateDoc(reference, {
          revokedAt: revoked.revokedAt ?? null,
          updatedAt: revoked.updatedAt,
        }),
      );
      return revoked;
    },

    async openSession(input: GuestSessionInput): Promise<void> {
      const reference = doc(collection(db, GUEST_SESSIONS_COLLECTION), input.userId.value);
      await withMappedErrors(() =>
        setDoc(reference, {
          userId: input.userId.value,
          workspaceId: input.workspaceId.value,
          tokenHash: input.tokenHash,
          createdAt: new Date(),
        }),
      );
    },
  };
}

function buildGuestLink(build: () => GuestLink): GuestLink {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function readGuestLink(tokenHash: string, data: unknown): GuestLink {
  return buildGuestLink(() => fromGuestLinkDocument(tokenHash, data));
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
      : 'Invalid guest link input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
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
