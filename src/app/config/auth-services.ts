import {
  createChangeUserEmail,
  createChangeUserPassword,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  createUpdateUserProfile,
  type ChangeUserEmail,
  type ChangeUserPassword,
  type LoginUser,
  type LogoutUser,
  type RegisterUser,
  type UpdateUserProfile,
} from '../../application/commands';
import { createSessionStore, type SessionStore } from '../../application/services';
import { createFirebaseAuthAdapter } from '../../infrastructure/firebase/firebase-auth-adapter';
import { getFirebaseAuth } from '../../infrastructure/firebase/firebase-app';

export interface AuthServices {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly updateUserProfile: UpdateUserProfile;
  readonly changeUserEmail: ChangeUserEmail;
  readonly changeUserPassword: ChangeUserPassword;
  readonly sessionStore: SessionStore;
}

export function createAuthServices(): AuthServices {
  const authPort = createFirebaseAuthAdapter(getFirebaseAuth());
  return {
    registerUser: createRegisterUser(authPort),
    loginUser: createLoginUser(authPort),
    logoutUser: createLogoutUser(authPort),
    updateUserProfile: createUpdateUserProfile(authPort),
    changeUserEmail: createChangeUserEmail(authPort),
    changeUserPassword: createChangeUserPassword(authPort),
    sessionStore: createSessionStore(authPort),
  };
}
