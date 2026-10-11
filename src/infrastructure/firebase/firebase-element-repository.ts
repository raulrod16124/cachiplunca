import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { ElementRepository } from '../../application/ports';
import { validateElement, type Element } from '../../domain/element';
import { ElementId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromElementDocument, toElementDocument } from './firebase-element-mapper';

const ELEMENTS_COLLECTION = 'elements';

export function createFirebaseElementRepository(db: Firestore): ElementRepository {
  const elementsCollection = collection(db, ELEMENTS_COLLECTION);
  const elementRef = (id: ElementId) => doc(elementsCollection, id.value);

  return {
    async listByWorkspace(workspaceId: WorkspaceId): Promise<Element[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(query(elementsCollection, where('workspaceId', '==', workspaceId.value))),
      );
      return snapshot.docs.map((document) => readElement(document.id, document.data()));
    },

    async findById(id: ElementId): Promise<Element | null> {
      const snapshot = await withMappedErrors(() => getDoc(elementRef(id)));
      if (!snapshot.exists()) {
        return null;
      }
      return readElement(snapshot.id, snapshot.data());
    },

    async save(element: Element): Promise<Element> {
      const validated = assertValidElement(element);
      const document = toElementDocument(validated);
      await withMappedErrors(() => setDoc(elementRef(validated.id), document));
      return validated;
    },

    async saveMany(elements: readonly Element[]): Promise<Element[]> {
      const validated = elements.map(assertValidElement);
      for (const element of validated) {
        const document = toElementDocument(element);
        await withMappedErrors(() => setDoc(elementRef(element.id), document));
      }
      return validated;
    },

    async delete(id: ElementId): Promise<void> {
      const current = await this.findById(id);
      if (current === null) {
        throw notFoundError(id);
      }
      await withMappedErrors(() => deleteDoc(elementRef(id)));
    },

    async deleteMany(ids: readonly ElementId[]): Promise<void> {
      for (const id of ids) {
        const current = await this.findById(id);
        if (current === null) {
          throw notFoundError(id);
        }
      }
      for (const id of ids) {
        await withMappedErrors(() => deleteDoc(elementRef(id)));
      }
    },
  };
}

function readElement(id: string, data: unknown): Element {
  try {
    return fromElementDocument(id, data);
  } catch (error) {
    throw toValidationError(error);
  }
}

function assertValidElement(element: Element): Element {
  try {
    validateElement(element);
    return element;
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid element input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function notFoundError(id: ElementId): AppError {
  return createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'The element does not exist.', {
    details: { elementId: id.value },
  });
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}
