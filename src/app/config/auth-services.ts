import {
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  type LoginUser,
  type LogoutUser,
  type RegisterUser,
} from '../../application/commands';
import { createSessionStore, type SessionStore } from '../../application/services';
import { createFirebaseAuthAdapter } from '../../infrastructure/firebase/firebase-auth-adapter';
import { getFirebaseAuth } from '../../infrastructure/firebase/firebase-app';

export interface AuthServices {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly sessionStore: SessionStore;
}

export function createAuthServices(): AuthServices {
  const authPort = createFirebaseAuthAdapter(getFirebaseAuth());
  return {
    registerUser: createRegisterUser(authPort),
    loginUser: createLoginUser(authPort),
    logoutUser: createLogoutUser(authPort),
    sessionStore: createSessionStore(authPort),
  };
}
