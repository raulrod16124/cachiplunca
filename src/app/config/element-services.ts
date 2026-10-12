import type { ElementRepository } from '../../application/ports';
import { createLoadWorkspaceElements, type LoadWorkspaceElements } from '../../application/queries';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseElementRepository } from '../../infrastructure/firebase/firebase-element-repository';

export interface ElementServices {
  readonly loadWorkspaceElements: LoadWorkspaceElements;
}

export function createElementServices(): ElementServices {
  const elementRepository: ElementRepository =
    createFirebaseElementRepository(getFirebaseFirestore());
  return {
    loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
  };
}
