import {
  createChangeUserEmail,
  createChangeUserPassword,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  createRefreshUser,
  createSendEmailVerification,
  createUpdateUserProfile,
  type ChangeUserEmail,
  type ChangeUserPassword,
  type LoginUser,
  type LogoutUser,
  type RefreshUser,
  type RegisterUser,
  type SendEmailVerification,
  type UpdateUserProfile,
} from '../../application/commands';
import type { AuthPort, AuthUser } from '../../application/ports';
import { createSessionStore, type SessionStore } from '../../application/services';

export interface AuthServices {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly signInAnonymously: () => Promise<AuthUser>;
  readonly updateUserProfile: UpdateUserProfile;
  readonly changeUserEmail: ChangeUserEmail;
  readonly changeUserPassword: ChangeUserPassword;
  readonly sendEmailVerification: SendEmailVerification;
  readonly refreshUser: RefreshUser;
  readonly sessionStore: SessionStore;
}

export function createAuthServicesWithPort(authPort: AuthPort): AuthServices {
  const sessionStore = createSessionStore(authPort);
  const registerUser = createRegisterUser(authPort);
  const updateUserProfile = createUpdateUserProfile(authPort);

  return {
    registerUser: async (input) => {
      const result = await registerUser(input);
      if (result.status === 'ok') {
        sessionStore.applyUser(result.user);
      }
      return result;
    },
    loginUser: createLoginUser(authPort),
    logoutUser: createLogoutUser(authPort),
    signInAnonymously: () => authPort.signInAnonymously(),
    updateUserProfile: async (input) => {
      const result = await updateUserProfile(input);
      if (result.status === 'ok') {
        sessionStore.applyUser(result.user);
      }
      return result;
    },
    changeUserEmail: createChangeUserEmail(authPort),
    changeUserPassword: createChangeUserPassword(authPort),
    sendEmailVerification: createSendEmailVerification(authPort),
    refreshUser: createRefreshUser(authPort),
    sessionStore,
  };
}
