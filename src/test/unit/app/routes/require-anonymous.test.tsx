import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAnonymous } from '../../../../app/routes/require-anonymous';
import { SessionProvider } from '../../../../app/providers/session-provider';
import type { AuthPort } from '../../../../application/ports';
import { createSessionStore } from '../../../../application/services';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';
import { PendingAuthPort } from '../../../fixtures/pending-auth-port';

function renderGuard(authPort: AuthPort): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <SessionProvider store={createSessionStore(authPort)}>
        <Routes>
          <Route element={<RequireAnonymous />}>
            <Route path="/login" element={<p>Guest content</p>} />
          </Route>
          <Route path="/workspaces" element={<p>Workspaces page</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('RequireAnonymous', () => {
  it('holds the current route without redirecting while the session loads', () => {
    renderGuard(new PendingAuthPort());

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
    expect(screen.queryByText('Guest content')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspaces page')).not.toBeInTheDocument();
  });

  it('redirects to /workspaces only after the session resolves as authenticated', async () => {
    const authPort = new PendingAuthPort();
    renderGuard(authPort);

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');

    await act(async () => {
      authPort.emitSession({
        uid: 'uid-1',
        email: 'user@example.com',
        emailVerified: false,
        displayName: null,
      });
    });

    expect(await screen.findByText('Workspaces page')).toBeInTheDocument();
    expect(screen.queryByText('Guest content')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the guest route for an anonymous session', async () => {
    renderGuard(new FakeAuthPort());

    expect(await screen.findByText('Guest content')).toBeInTheDocument();
    expect(screen.queryByText('Workspaces page')).not.toBeInTheDocument();
  });

  it('redirects an authenticated visitor away from the guest route', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    renderGuard(authPort);

    expect(await screen.findByText('Workspaces page')).toBeInTheDocument();
    expect(screen.queryByText('Guest content')).not.toBeInTheDocument();
  });
});
