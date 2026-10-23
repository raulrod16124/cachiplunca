import { createFirebaseAuthAdapter } from '../../infrastructure/firebase/firebase-auth-adapter';
import { getFirebaseAuth } from '../../infrastructure/firebase/firebase-app';
import { createAuthServicesWithPort, type AuthServices } from './auth-service-composition';

export type { AuthServices };
export { createAuthServicesWithPort };

export function createAuthServices(): AuthServices {
  return createAuthServicesWithPort(createFirebaseAuthAdapter(getFirebaseAuth()));
}
