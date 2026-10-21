import type {
  AuthCredentials,
  AuthPort,
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  SessionListener,
} from '../../application/ports';
import type { Unsubscribe } from '../../shared/types';

/**
 * AuthPort whose session never resolves on its own: `observeSession` records
 * the listener without emitting, so tests can hold the app in the `loading`
 * state and decide exactly when (and with what) the session resolves.
 */
export class PendingAuthPort implements AuthPort {
  readonly #listeners = new Set<SessionListener>();

  async signUp(_credentials: AuthCredentials): Promise<AuthUser> {
    throw new Error('unexpected signUp call');
  }

  async signIn(_credentials: AuthCredentials): Promise<AuthUser> {
    throw new Error('unexpected signIn call');
  }

  async signInAnonymously(): Promise<AuthUser> {
    throw new Error('unexpected signInAnonymously call');
  }

  async signOut(): Promise<void> {
    throw new Error('unexpected signOut call');
  }

  async setSessionPersistence(): Promise<void> {
    throw new Error('unexpected setSessionPersistence call');
  }

  async updateDisplayName(_displayName: string): Promise<AuthUser> {
    throw new Error('unexpected updateDisplayName call');
  }

  async changeEmail(_input: ChangeEmailInput): Promise<AuthUser> {
    throw new Error('unexpected changeEmail call');
  }

  async changePassword(_input: ChangePasswordInput): Promise<void> {
    throw new Error('unexpected changePassword call');
  }

  async sendEmailVerification(): Promise<void> {
    throw new Error('unexpected sendEmailVerification call');
  }

  async refreshUser(): Promise<AuthUser> {
    throw new Error('unexpected refreshUser call');
  }

  observeSession(listener: SessionListener): Unsubscribe {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  emitSession(user: AuthUser | null): void {
    for (const listener of this.#listeners) {
      listener(user);
    }
  }

  activeSessionListenerCount(): number {
    return this.#listeners.size;
  }
}
