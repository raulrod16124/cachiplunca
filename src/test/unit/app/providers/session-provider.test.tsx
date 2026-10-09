import { render, screen, waitFor } from '@testing-library/react';
import { act, StrictMode, type ReactNode } from 'react';
import type { AuthPort, AuthUser, SessionListener } from '../../../../application/ports';
import { createSessionStore, type SessionStore } from '../../../../application/services';
import { SessionProvider, useSession } from '../../../../app/providers/session-provider';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

function SessionProbe(): ReactNode {
  const session = useSession();
  return <p role="status">{session.status}</p>;
}

function renderSession(store: SessionStore): ReturnType<typeof render> {
  return render(
    <SessionProvider store={store}>
      <SessionProbe />
    </SessionProvider>,
  );
}

interface PendingAuthPort {
  readonly port: AuthPort;
  readonly emit: (user: AuthUser | null) => void;
}

function createPendingAuthPort(): PendingAuthPort {
  const listeners = new Set<SessionListener>();
  const port: AuthPort = {
    signUp: () => Promise.reject(new Error('unexpected signUp call')),
    signIn: () => Promise.reject(new Error('unexpected signIn call')),
    signOut: () => Promise.reject(new Error('unexpected signOut call')),
    observeSession(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    emit: (user) => {
      for (const listener of listeners) {
        listener(user);
      }
    },
  };
}

describe('SessionProvider', () => {
  it('exposes loading until the port emits its first session', async () => {
    const { port, emit } = createPendingAuthPort();

    renderSession(createSessionStore(port));
    expect(screen.getByRole('status')).toHaveTextContent('loading');

    const user: AuthUser = {
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: false,
      displayName: null,
    };
    await act(async () => {
      emit(user);
    });
    expect(screen.getByRole('status')).toHaveTextContent('authenticated');

    await act(async () => {
      emit(null);
    });
    expect(screen.getByRole('status')).toHaveTextContent('anonymous');
  });

  it('restores an already persisted session without any interaction', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });

    renderSession(createSessionStore(authPort));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authenticated'));
  });

  it('reports an anonymous session when there is nothing to restore', async () => {
    renderSession(createSessionStore(new FakeAuthPort()));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('anonymous'));
  });

  it('releases the port subscription when unmounted', async () => {
    const authPort = new FakeAuthPort();
    const { unmount } = renderSession(createSessionStore(authPort));

    await waitFor(() => expect(authPort.activeSessionListenerCount()).toBe(1));
    unmount();

    expect(authPort.activeSessionListenerCount()).toBe(0);
  });

  it('keeps a single port listener under StrictMode double mounting', async () => {
    const authPort = new FakeAuthPort();
    const store = createSessionStore(authPort);
    const { unmount } = render(
      <StrictMode>
        <SessionProvider store={store}>
          <SessionProbe />
        </SessionProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(authPort.activeSessionListenerCount()).toBe(1));
    expect(screen.getByRole('status')).toHaveTextContent('anonymous');

    unmount();
    expect(authPort.activeSessionListenerCount()).toBe(0);
  });

  it('throws when useSession is used outside a SessionProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<SessionProbe />)).toThrow(
      'useSession must be used within a SessionProvider.',
    );

    consoleError.mockRestore();
  });
});
