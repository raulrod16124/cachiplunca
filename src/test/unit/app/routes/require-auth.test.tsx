import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../../../../app/routes/require-auth';
import { SessionProvider } from '../../../../app/providers/session-provider';
import type { AuthPort } from '../../../../application/ports';
import { createSessionStore } from '../../../../application/services';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';
import { PendingAuthPort } from '../../../fixtures/pending-auth-port';

function renderGuard(authPort: AuthPort): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/workspaces']}>
      <SessionProvider store={createSessionStore(authPort)}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/workspaces" element={<p>Protected content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('holds the current route without redirecting while the session loads', () => {
    renderGuard(new PendingAuthPort());

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects to /login only after the session resolves as anonymous', async () => {
    const authPort = new PendingAuthPort();
    renderGuard(authPort);

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');

    await act(async () => {
      authPort.emitSession(null);
    });

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('redirects an anonymous visitor away from the protected route', async () => {
    renderGuard(new FakeAuthPort());

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the protected route for an authenticated session', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    renderGuard(authPort);

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
