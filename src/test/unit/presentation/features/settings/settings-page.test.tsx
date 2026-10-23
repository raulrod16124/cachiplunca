import { act, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { SystemEnvironment } from '../../../../../application/ports';
import { createSessionStore, createUserSettingsStore } from '../../../../../application/services';
import { UserSettings } from '../../../../../domain/user-settings';
import { UserId } from '../../../../../domain/shared';
import { SessionProvider } from '../../../../../presentation/providers/session-provider';
import { UserSettingsProvider } from '../../../../../presentation/providers/user-settings-provider';
import { SettingsPage } from '../../../../../presentation/features/settings';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

jest.mock('../../../../../presentation/features/notifications', () => ({
  NotificationsButton: () => null,
}));

const USER_ID = UserId.create('user-1');
const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));

const ENVIRONMENT: SystemEnvironment = {
  getReducedMotionPref: () => false,
  getLanguages: () => ['en-US'],
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

function createSettingsStore() {
  return createUserSettingsStore(
    {
      getByUserId: async () => UserSettings.create({ userId: USER_ID }),
      upsert: async (settings) => settings,
    },
    ENVIRONMENT,
  );
}

async function renderSettingsPage(): Promise<void> {
  const authPort = new FakeAuthPort();
  await authPort.signUp({
    email: 'ada@example.com',
    password: 'secret123',
    displayName: 'Ada Lovelace',
  });

  render(
    <MemoryRouter initialEntries={['/settings']}>
      <UserSettingsProvider store={createSettingsStore()} userId={USER_ID}>
        <SessionProvider store={createSessionStore(authPort)}>
          <SettingsPage logoutUser={logoutUser} />
        </SessionProvider>
      </UserSettingsProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('renders the page heading and all preference controls', async () => {
    await act(async () => {
      await renderSettingsPage();
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Theme' })).toBeEnabled());
    expect(screen.getByRole('combobox', { name: 'Font size' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeInTheDocument();
  });
});
