import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly displayName: string | null;
}

export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

export type SessionListener = (user: AuthUser | null) => void;

export type SessionErrorListener = (error: AppError) => void;

export interface AuthPort {
  signUp(credentials: AuthCredentials): Promise<AuthUser>;
  signIn(credentials: AuthCredentials): Promise<AuthUser>;
  signOut(): Promise<void>;
  observeSession(listener: SessionListener, onError?: SessionErrorListener): Unsubscribe;
}
