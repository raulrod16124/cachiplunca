import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type {
  AuthCredentials,
  AuthPort,
  AuthUser,
  SessionErrorListener,
  SessionListener,
} from '../../application/ports';
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
