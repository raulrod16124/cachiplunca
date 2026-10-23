import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../../../../../presentation/providers/session-provider';
import type {
  AcceptInvitation,
  RefreshUser,
  SendEmailVerification,
} from '../../../../../application/commands';
import { createSessionStore } from '../../../../../application/services';
import type { AuthPort } from '../../../../../application/ports';
import { WorkspaceId } from '../../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import { AcceptInvitationPage } from '../../../../../presentation/features/invitations';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';
import { PendingAuthPort } from '../../../../fixtures/pending-auth-port';

const WORKSPACE = WorkspaceId.create('ws-1');

function renderPage(
  authPort: AuthPort,
  acceptInvitation: AcceptInvitation,
  options: {
    readonly sendEmailVerification?: SendEmailVerification;
    readonly refreshUser?: RefreshUser;
  } = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/invitations/token-1']}>
      <Routes>
        <Route
          path="/invitations/:token"
          element={
            <SessionProvider store={createSessionStore(authPort)}>
              <AcceptInvitationPage
                acceptInvitation={acceptInvitation}
                sendEmailVerification={options.sendEmailVerification}
                refreshUser={options.refreshUser}
              />
            </SessionProvider>
          }
        />
        <Route path="/workspaces" element={<p>Workspaces page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AcceptInvitationPage', () => {
  it('holds the page while the session loads', () => {
    renderPage(new PendingAuthPort(), jest.fn());

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
  });

  it('prompts anonymous visitors to sign in or create an account', async () => {
    const acceptInvitation = jest.fn<ReturnType<AcceptInvitation>, Parameters<AcceptInvitation>>();
    renderPage(new FakeAuthPort(), acceptInvitation);

    expect(await screen.findByRole('heading', { name: 'Accept invitation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('accepts the invitation for the authenticated user', async () => {
    const authPort = new FakeAuthPort();
    const user = await authPort.signUp({
      email: 'invitee@example.com',
      password: 'secret123',
      displayName: 'Invitee',
    });
    authPort.setSession({ ...user, emailVerified: true });
    const acceptInvitation = jest
      .fn<ReturnType<AcceptInvitation>, Parameters<AcceptInvitation>>()
      .mockResolvedValue({ status: 'ok', workspaceId: WORKSPACE, role: 'editor' });

    renderPage(authPort, acceptInvitation);

    expect(await screen.findByRole('heading', { name: 'Invitation accepted' })).toBeInTheDocument();
    expect(acceptInvitation).toHaveBeenCalledTimes(1);
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: 'token-1',
      userId: expect.objectContaining({ value: user.uid }),
      userEmail: 'invitee@example.com',
      userEmailVerified: true,
    });
    expect(screen.getByRole('button', { name: 'Go to board' })).toBeInTheDocument();
  });

  it('shows a friendly message when the invitation cannot be accepted', async () => {
    const authPort = new FakeAuthPort();
    const user = await authPort.signUp({
      email: 'invitee@example.com',
      password: 'secret123',
      displayName: 'Invitee',
    });
    authPort.setSession({ ...user, emailVerified: true });
    const acceptInvitation = jest
      .fn<ReturnType<AcceptInvitation>, Parameters<AcceptInvitation>>()
      .mockResolvedValue({
        status: 'error',
        error: createAppError('validation', ERROR_CODES.INVITATION_EXPIRED, 'expired'),
      });

    renderPage(authPort, acceptInvitation);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation has expired. Ask the board owner for a new one.',
    );
  });

  it('asks the user to verify their email before accepting', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({
      email: 'invitee@example.com',
      password: 'secret123',
      displayName: 'Invitee',
    });
    const acceptInvitation = jest.fn<ReturnType<AcceptInvitation>, Parameters<AcceptInvitation>>();
    const sendEmailVerification = jest
      .fn<ReturnType<SendEmailVerification>, Parameters<SendEmailVerification>>()
      .mockResolvedValue({ status: 'ok' });

    renderPage(authPort, acceptInvitation, { sendEmailVerification });

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument();
    expect(acceptInvitation).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "I've verified my email" })).toBeInTheDocument();
  });
});
