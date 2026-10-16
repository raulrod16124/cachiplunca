import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import type {
  PresenceChange,
  PresenceErrorListener,
  PresenceListener,
  PresencePort,
  RealtimeChangeOrigin,
  RealtimeConnectionListener,
  RealtimeConnectionStatus,
} from '../../application/ports';
import type { Presence } from '../../domain/collaboration';
import { UserId, type WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromPresenceDocument, toPresenceDocument } from './firebase-presence-mapper';

const PRESENCE_COLLECTION = 'presence';

export function createFirebasePresenceAdapter(db: Firestore): PresencePort {
  const presenceCollection = collection(db, PRESENCE_COLLECTION);
  const presenceRef = (workspaceId: WorkspaceId, userId: UserId) =>
    doc(presenceCollection, presenceDocId(workspaceId.value, userId.value));

  return {
    subscribe(
      workspaceId: WorkspaceId,
      listener: PresenceListener,
      onError?: PresenceErrorListener,
      onConnectionChange?: RealtimeConnectionListener,
    ): Unsubscribe {
      const target = query(presenceCollection, where('workspaceId', '==', workspaceId.value));

      let isInitialSnapshot = true;
      let isActive = true;
      let connectionStatus: RealtimeConnectionStatus = 'connected';

      const reportConnection = (next: RealtimeConnectionStatus): void => {
        if (next === connectionStatus) {
          return;
        }
        connectionStatus = next;
        onConnectionChange?.(next);
      };

      const handleError = (error: unknown): void => {
        reportConnection('reconnecting');
        if (onError === undefined) {
          return;
        }
        onError(toCollaborationError(error));
      };

      const unsubscribeFromFirestore = onSnapshot(
        target,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!isActive) {
            return;
          }
          reportConnection(resolveConnectionStatus(snapshot));
          if (isInitialSnapshot) {
            isInitialSnapshot = false;
            return;
          }
          try {
            const changes = toPresenceChanges(snapshot, workspaceId);
            if (changes.length === 0) {
              return;
            }
            listener({ workspaceId, changes });
          } catch (error) {
            handleError(error);
          }
        },
        (error: unknown) => {
          if (isActive) {
            handleError(error);
          }
        },
      );

      return () => {
        if (!isActive) {
          return;
        }
        isActive = false;
        unsubscribeFromFirestore();
      };
    },

    async announce(presence: Presence): Promise<void> {
      const reference = presenceRef(presence.workspaceId, presence.userId);
      await withMappedErrors(() => setDoc(reference, toPresenceDocument(presence)));
    },

    async withdraw(workspaceId: WorkspaceId, userId: UserId): Promise<void> {
      await withMappedErrors(() => deleteDoc(presenceRef(workspaceId, userId)));
    },
  };
}

export function presenceDocId(workspaceId: string, userId: string): string {
  return `${workspaceId}_${userId}`;
}

function resolveConnectionStatus(snapshot: QuerySnapshot<DocumentData>): RealtimeConnectionStatus {
  return snapshot.metadata.fromCache ? 'reconnecting' : 'connected';
}

function toPresenceChanges(
  snapshot: QuerySnapshot<DocumentData>,
  workspaceId: WorkspaceId,
): PresenceChange[] {
  const changes: PresenceChange[] = [];

  for (const change of snapshot.docChanges()) {
    const origin = resolveOrigin(change.doc);

    if (change.type === 'removed') {
      changes.push({
        kind: 'left',
        userId: readUserId(change.doc.id, workspaceId.value),
        origin,
      });
      continue;
    }

    const presence = readPresence(change.doc);
    changes.push(
      change.type === 'added'
        ? { kind: 'joined', presence, origin }
        : { kind: 'updated', presence, origin },
    );
  }

  return changes;
}

function resolveOrigin(document: QueryDocumentSnapshot<DocumentData>): RealtimeChangeOrigin {
  return document.metadata.hasPendingWrites ? 'local' : 'remote';
}

function readPresence(document: QueryDocumentSnapshot<DocumentData>): Presence {
  try {
    return fromPresenceDocument(document.data());
  } catch (error) {
    throw toCollaborationError(error);
  }
}

function readUserId(documentId: string, workspaceId: string): UserId {
  const prefix = `${workspaceId}_`;
  const userId = documentId.startsWith(prefix) ? documentId.slice(prefix.length) : documentId;
  return UserId.create(userId);
}

function toCollaborationError(error: unknown): AppError {
  const mapped = mapFirebaseError(error);
  if (mapped.kind === 'collaboration' && mapped.code === ERROR_CODES.COLLABORATION_SYNC_FAILED) {
    return mapped;
  }
  return createAppError(
    'collaboration',
    ERROR_CODES.COLLABORATION_SYNC_FAILED,
    'The presence channel failed.',
    { cause: mapped },
  );
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}
