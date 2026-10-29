import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { SystemEnvironment } from '../../../../../application/ports';
import { createSessionStore, createUserSettingsStore } from '../../../../../application/services';
import { UserSettings } from '../../../../../domain/user-settings';
import { UserId } from '../../../../../domain/shared';
import { I18nProvider } from '../../../../../presentation/i18n';
import { SessionProvider } from '../../../../../presentation/providers/session-provider';
import { UserSettingsProvider } from '../../../../../presentation/providers/user-settings-provider';
import { SettingsPage } from '../../../../../presentation/features/settings';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

jest.mock('../../../../../presentation/features/notifications', () => ({
  NotificationsButton: () => null,
}));

const USER_ID = UserId.create('user-1');
const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
const upsert = jest.fn(async (settings: UserSettings) => settings);

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

beforeEach(() => {
  upsert.mockClear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('data-font-size');
  document.documentElement.removeAttribute('data-reduced-motion');
});

function createSettingsStore() {
  return createUserSettingsStore(
    {
      getByUserId: async () => UserSettings.create({ userId: USER_ID }),
      upsert,
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
        <I18nProvider>
          <SessionProvider store={createSessionStore(authPort)}>
            <SettingsPage logoutUser={logoutUser} />
          </SessionProvider>
        </I18nProvider>
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
    await waitFor(() => expect(screen.getByRole('radio', { name: 'System' })).toBeEnabled());
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Font size' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System (browser)' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeInTheDocument();
  });

  it('updates the document theme and locale and persists both preferences', async () => {
    const user = userEvent.setup();
    await act(async () => {
      await renderSettingsPage();
    });

    const dark = await screen.findByRole('radio', { name: 'Dark' });
    await waitFor(() => expect(dark).toBeEnabled());

    await user.click(dark);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));

    await user.click(screen.getByRole('radio', { name: 'Español (Spanish)' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'es');
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configuración' }),
    ).toBeInTheDocument();
    expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ locale: 'es' }));
  });
});
