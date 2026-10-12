import type { ElementRepository } from '../../application/ports';
import { createLoadWorkspaceElements, type LoadWorkspaceElements } from '../../application/queries';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
  createRealtimeSubscriptionManager,
  type ElementPersistenceOrchestrator,
  type RealtimeSubscriptionManager,
} from '../../application/services';
import { ElementId } from '../../domain/shared';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseElementRepository } from '../../infrastructure/firebase/firebase-element-repository';
import { createFirebaseRealtimeAdapter } from '../../infrastructure/firebase/firebase-realtime-adapter';

export type GenerateElementId = () => ElementId;

export interface ElementServices {
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: GenerateElementId;
}

export function createElementServices(): ElementServices {
  const db = getFirebaseFirestore();
  const elementRepository: ElementRepository = createFirebaseElementRepository(db);
  const elementPersistence = createElementPersistence(elementRepository);
  return {
    loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
    elementPersistenceOrchestrator: createElementPersistenceOrchestrator(elementPersistence),
    realtimeSubscriptionManager: createRealtimeSubscriptionManager(
      createFirebaseRealtimeAdapter(db),
    ),
    generateElementId: () => ElementId.create(crypto.randomUUID()),
  };
}
