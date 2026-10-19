import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification as firebaseSendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateEmail,
  updatePassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import type {
  AuthCredentials,
  AuthPort,
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  SessionErrorListener,
  SessionListener,
} from '../../application/ports';
import { createAppError, ERROR_CODES } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import { mapFirebaseError } from './firebase-error-mapper';

export function mapFirebaseUserToAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  };
}

function requireCurrentUser(auth: Auth): User {
  const user = auth.currentUser;
  if (user === null || user.email === null) {
    throw createAppError(
      'authorization',
      ERROR_CODES.AUTH_UNAUTHENTICATED,
      'You must be signed in to perform this action.',
    );
  }
  return user;
}

async function reauthenticate(user: User, currentPassword: string): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email ?? '', currentPassword);
  await reauthenticateWithCredential(user, credential);
}

export function createFirebaseAuthAdapter(auth: Auth): AuthPort {
  return {
    async signUp(credentials: AuthCredentials): Promise<AuthUser> {
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password,
        );
        return mapFirebaseUserToAuthUser(credential.user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async signIn(credentials: AuthCredentials): Promise<AuthUser> {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password,
        );
        return mapFirebaseUserToAuthUser(credential.user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async signOut(): Promise<void> {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async updateDisplayName(displayName: string): Promise<AuthUser> {
      try {
        const user = requireCurrentUser(auth);
        await updateProfile(user, { displayName });
        return mapFirebaseUserToAuthUser(user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async changeEmail(input: ChangeEmailInput): Promise<AuthUser> {
      try {
        const user = requireCurrentUser(auth);
        await reauthenticate(user, input.currentPassword);
        await updateEmail(user, input.email);
        return mapFirebaseUserToAuthUser(user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async changePassword(input: ChangePasswordInput): Promise<void> {
      try {
        const user = requireCurrentUser(auth);
        await reauthenticate(user, input.currentPassword);
        await updatePassword(user, input.newPassword);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async sendEmailVerification(): Promise<void> {
      try {
        const user = requireCurrentUser(auth);
        await firebaseSendEmailVerification(user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    async refreshUser(): Promise<AuthUser> {
      try {
        const user = requireCurrentUser(auth);
        await reload(user);
        await user.getIdToken(true);
        return mapFirebaseUserToAuthUser(user);
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },

    observeSession(listener: SessionListener, onError?: SessionErrorListener): Unsubscribe {
      return onAuthStateChanged(
        auth,
        (user) => listener(user === null ? null : mapFirebaseUserToAuthUser(user)),
        (error) => {
          onError?.(mapFirebaseError(error));
        },
      );
    },
  };
}
