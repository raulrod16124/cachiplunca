import type { PresencePort } from '../../application/ports';
import { createFirebasePresenceAdapter } from '../../infrastructure/firebase/firebase-presence-adapter';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface PresenceServices {
  readonly presencePort: PresencePort;
}

export function createPresenceServices(): PresenceServices {
  return {
    presencePort: createFirebasePresenceAdapter(getFirebaseFirestore()),
  };
}
