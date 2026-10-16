import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAnonymous, resolveRedirect } from '../../../../app/routes/require-anonymous';
import { SessionProvider } from '../../../../presentation/providers/session-provider';
import type { AuthPort } from '../../../../application/ports';
import { createSessionStore } from '../../../../application/services';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';
import { PendingAuthPort } from '../../../fixtures/pending-auth-port';

function renderGuard(authPort: AuthPort, initialEntry = '/login'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionProvider store={createSessionStore(authPort)}>
        <Routes>
          <Route element={<RequireAnonymous />}>
            <Route path="/login" element={<p>Guest content</p>} />
          </Route>
          <Route path="/workspaces" element={<p>Workspaces page</p>} />
          <Route path="/invitations/:token" element={<p>Invitation page</p>} />
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

  it('returns authenticated visitors to a safe redirect target', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    renderGuard(authPort, '/login?redirect=%2Finvitations%2Ftoken-1');

    expect(await screen.findByText('Invitation page')).toBeInTheDocument();
    expect(screen.queryByText('Workspaces page')).not.toBeInTheDocument();
  });
});

describe('resolveRedirect', () => {
  it('accepts internal paths', () => {
    expect(resolveRedirect('?redirect=/invitations/token-1')).toBe('/invitations/token-1');
    expect(resolveRedirect('?redirect=/invitations/token%2F1')).toBe('/invitations/token/1');
  });

  it('rejects missing, external and protocol-relative targets', () => {
    expect(resolveRedirect('')).toBeNull();
    expect(resolveRedirect('?redirect=https://evil.test')).toBeNull();
    expect(resolveRedirect('?redirect=//evil.test')).toBeNull();
    expect(resolveRedirect('?redirect=relative')).toBeNull();
  });

  it('rejects backslash targets that browsers normalize into protocol-relative URLs', () => {
    expect(resolveRedirect('?redirect=/\\evil.test')).toBeNull();
    expect(resolveRedirect('?redirect=/%5Cevil.test')).toBeNull();
    expect(resolveRedirect('?redirect=/workspaces\\..\\evil.test')).toBeNull();
  });
});
