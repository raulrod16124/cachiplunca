import type {
  AuthCredentials,
  AuthPort,
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  SessionErrorListener,
  SessionListener,
} from '../../application/ports';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

interface StoredUser {
  readonly password: string;
  readonly user: AuthUser;
}

export class FakeAuthPort implements AuthPort {
  #users = new Map<string, StoredUser>();
  #session: AuthUser | null = null;
  #listeners = new Set<SessionListener>();
  #errorListeners = new Set<SessionErrorListener>();
  #sequence = 0;

  async signUp(credentials: AuthCredentials): Promise<AuthUser> {
    const key = normalizeEmail(credentials.email);

    if (this.#users.has(key)) {
      throw createAppError(
        'conflict',
        ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
        'The email address is already in use.',
      );
    }

    const user: AuthUser = {
      uid: `fake-uid-${++this.#sequence}`,
      email: credentials.email,
      emailVerified: false,
      displayName: null,
    };

    this.#users.set(key, { password: credentials.password, user });
    this.#setSession(user);
    return user;
  }

  async signIn(credentials: AuthCredentials): Promise<AuthUser> {
    const stored = this.#users.get(normalizeEmail(credentials.email));

    if (stored === undefined || stored.password !== credentials.password) {
      throw createAppError(
        'authorization',
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'The credentials are not valid.',
      );
    }

    this.#setSession(stored.user);
    return stored.user;
  }

  async signInAnonymously(): Promise<AuthUser> {
    const user: AuthUser = {
      uid: `fake-guest-${++this.#sequence}`,
      email: null,
      emailVerified: false,
      displayName: null,
    };

    this.#setSession(user);
    return user;
  }

  async signOut(): Promise<void> {
    this.#setSession(null);
  }

  async updateDisplayName(displayName: string): Promise<AuthUser> {
    const session = this.#requireSession();
    const stored = this.#users.get(normalizeEmail(session.email ?? ''));
    if (stored === undefined) {
      throw createAppError(
        'authorization',
        ERROR_CODES.AUTH_UNAUTHENTICATED,
        'You must be signed in to perform this action.',
      );
    }

    const updated: AuthUser = { ...stored.user, displayName };
    this.#users.set(normalizeEmail(session.email ?? ''), { ...stored, user: updated });
    this.#setSession(updated);
    return updated;
  }

  async changeEmail(input: ChangeEmailInput): Promise<AuthUser> {
    const session = this.#requireSession();
    const currentKey = normalizeEmail(session.email ?? '');
    const stored = this.#users.get(currentKey);
    if (stored === undefined || stored.password !== input.currentPassword) {
      throw createAppError(
        'authorization',
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'The credentials are not valid.',
      );
    }

    const nextKey = normalizeEmail(input.email);
    if (nextKey !== currentKey && this.#users.has(nextKey)) {
      throw createAppError(
        'conflict',
        ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
        'The email address is already in use.',
      );
    }

    const updated: AuthUser = { ...stored.user, email: input.email.trim() };
    this.#users.delete(currentKey);
    this.#users.set(nextKey, { ...stored, user: updated });
    this.#setSession(updated);
    return updated;
  }

  async sendEmailVerification(): Promise<void> {
    this.#requireSession();
  }

  async refreshUser(): Promise<AuthUser> {
    return this.#requireSession();
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    const session = this.#requireSession();
    const key = normalizeEmail(session.email ?? '');
    const stored = this.#users.get(key);
    if (stored === undefined || stored.password !== input.currentPassword) {
      throw createAppError(
        'authorization',
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'The credentials are not valid.',
      );
    }

    this.#users.set(key, { ...stored, password: input.newPassword });
  }

  #requireSession(): AuthUser {
    if (this.#session === null) {
      throw createAppError(
        'authorization',
        ERROR_CODES.AUTH_UNAUTHENTICATED,
        'You must be signed in to perform this action.',
      );
    }
    return this.#session;
  }

  observeSession(listener: SessionListener, onError?: SessionErrorListener): Unsubscribe {
    this.#listeners.add(listener);
    if (onError !== undefined) {
      this.#errorListeners.add(onError);
    }
    listener(this.#session);
    return () => {
      this.#listeners.delete(listener);
      if (onError !== undefined) {
        this.#errorListeners.delete(onError);
      }
    };
  }

  activeSessionListenerCount(): number {
    return this.#listeners.size;
  }

  setSession(next: AuthUser | null): void {
    this.#setSession(next);
  }

  emitSessionError(error: AppError): void {
    for (const errorListener of this.#errorListeners) {
      errorListener(error);
    }
  }

  #setSession(next: AuthUser | null): void {
    if (sameUser(this.#session, next)) {
      return;
    }
    this.#session = next;
    for (const listener of this.#listeners) {
      listener(next);
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.uid === b.uid &&
    a.email === b.email &&
    a.emailVerified === b.emailVerified &&
    a.displayName === b.displayName
  );
}
