import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthPort } from '../../../../../application/ports';
import type { OpenGuestWorkspace } from '../../../../../application/commands';
import { createSessionStore } from '../../../../../application/services';
import { ElementId } from '../../../../../domain/shared';
import { GuestWorkspacePage } from '../../../../../presentation/features/guest/guest-workspace-page';
import { SessionProvider } from '../../../../../presentation/providers/session-provider';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';
import { PendingAuthPort } from '../../../../fixtures/pending-auth-port';

function renderPage(authPort: AuthPort, openGuestWorkspace: OpenGuestWorkspace): void {
  render(
    <MemoryRouter initialEntries={['/view/token-1']}>
      <Routes>
        <Route
          path="/view/:token"
          element={
            <SessionProvider store={createSessionStore(authPort)}>
              <GuestWorkspacePage
                openGuestWorkspace={openGuestWorkspace}
                generateElementId={() => ElementId.create('generated')}
              />
            </SessionProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestWorkspacePage', () => {
  it('shows the full-page loading screen while the session restores', () => {
    renderPage(new PendingAuthPort(), jest.fn());

    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]).toHaveTextContent('Restoring your session…');
    expect(status[0]).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('shows the full-page loading screen while opening the shared board', async () => {
    const authPort = new FakeAuthPort();
    const openGuestWorkspace = jest
      .fn<ReturnType<OpenGuestWorkspace>, Parameters<OpenGuestWorkspace>>()
      .mockImplementation(() => new Promise(() => undefined));

    renderPage(authPort, openGuestWorkspace);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Opening shared board…');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('full-page-loading')).toBeInTheDocument();
  });
});
