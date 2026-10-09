import type { AuthCredentials, AuthPort, AuthUser, SessionListener } from '../../application/ports';
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

  async signOut(): Promise<void> {
    throw new Error('unexpected signOut call');
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
