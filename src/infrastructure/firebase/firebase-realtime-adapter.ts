import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import type {
  ElementRealtimeChange,
  RealtimeChangeOrigin,
  RealtimeErrorListener,
  RealtimeEventListener,
  RealtimePort,
} from '../../application/ports';
import type { Element } from '../../domain/element';
import { ElementId, type WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import { fromElementDocument } from './firebase-element-mapper';
import { mapFirebaseError } from './firebase-error-mapper';

const ELEMENTS_COLLECTION = 'elements';

export function createFirebaseRealtimeAdapter(db: Firestore): RealtimePort {
  const elementsCollection = collection(db, ELEMENTS_COLLECTION);

  return {
    subscribe(
      workspaceId: WorkspaceId,
      listener: RealtimeEventListener,
      onError?: RealtimeErrorListener,
    ): Unsubscribe {
      const target = query(elementsCollection, where('workspaceId', '==', workspaceId.value));

      let isInitialSnapshot = true;
      let isActive = true;

      const handleError = (error: unknown): void => {
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
          if (isInitialSnapshot) {
            isInitialSnapshot = false;
            return;
          }
          try {
            const changes = toElementChanges(snapshot);
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
  };
}

function toElementChanges(snapshot: QuerySnapshot<DocumentData>): ElementRealtimeChange[] {
  const changes: ElementRealtimeChange[] = [];

  for (const change of snapshot.docChanges()) {
    const origin = resolveOrigin(change.doc);

    if (change.type === 'removed') {
      changes.push({ kind: 'removed', elementId: ElementId.create(change.doc.id), origin });
      continue;
    }

    const element = readElement(change.doc);
    if (change.type === 'added') {
      changes.push({ kind: 'added', element, origin });
    } else {
      changes.push({ kind: 'modified', element, origin });
    }
  }

  return changes;
}

function resolveOrigin(document: QueryDocumentSnapshot<DocumentData>): RealtimeChangeOrigin {
  return document.metadata.hasPendingWrites ? 'local' : 'remote';
}

function readElement(document: QueryDocumentSnapshot<DocumentData>): Element {
  try {
    return fromElementDocument(document.id, document.data());
  } catch (error) {
    throw toCollaborationError(error);
  }
}

function toCollaborationError(error: unknown): AppError {
  const mapped = mapFirebaseError(error);
  if (mapped.kind === 'collaboration' && mapped.code === ERROR_CODES.COLLABORATION_SYNC_FAILED) {
    return mapped;
  }
  return createAppError(
    'collaboration',
    ERROR_CODES.COLLABORATION_SYNC_FAILED,
    'The realtime collaboration channel failed.',
    { cause: mapped },
  );
}
