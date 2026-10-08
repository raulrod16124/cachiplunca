import type { AuthCredentials, AuthPort, AuthUser, SessionListener } from '../../application/ports';
import { createAppError, ERROR_CODES } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

interface StoredUser {
  readonly password: string;
  readonly user: AuthUser;
}

export class FakeAuthPort implements AuthPort {
  #users = new Map<string, StoredUser>();
  #session: AuthUser | null = null;
  #listeners = new Set<SessionListener>();
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

  async signOut(): Promise<void> {
    this.#setSession(null);
  }

  observeSession(listener: SessionListener): Unsubscribe {
    this.#listeners.add(listener);
    listener(this.#session);
    return () => {
      this.#listeners.delete(listener);
    };
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
  return a.uid === b.uid;
}
