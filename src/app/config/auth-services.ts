import { createRegisterUser, type RegisterUser } from '../../application/commands';
import { createFirebaseAuthAdapter } from '../../infrastructure/firebase/firebase-auth-adapter';
import { getFirebaseAuth } from '../../infrastructure/firebase/firebase-app';

export interface AuthServices {
  readonly registerUser: RegisterUser;
}

export function createAuthServices(): AuthServices {
  const authPort = createFirebaseAuthAdapter(getFirebaseAuth());
  return { registerUser: createRegisterUser(authPort) };
}
