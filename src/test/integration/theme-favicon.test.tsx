import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../setup/render-with-theme';
import type { SystemEnvironment } from '../../application/ports';
import { createUserSettingsStore } from '../../application/services';
import { UserSettings } from '../../domain/user-settings';
import { UserId } from '../../domain/shared';
import { SettingsControls } from '../../presentation/features/settings/settings-controls';
import { UserSettingsProvider } from '../../presentation/providers/user-settings-provider';

const USER_ID = UserId.create('user-1');

const ENVIRONMENT: SystemEnvironment = {
  getReducedMotionPref: () => false,
  getLanguages: () => ['en-US'],
};

const originalMatchMedia = window.matchMedia;

function installMatchMedia(matches: boolean): void {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const mediaQueryList = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject): void => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject): void => {
      listeners.delete(listener);
    },
    addListener: (listener: EventListenerOrEventListenerObject): void => {
      listeners.add(listener);
    },
    removeListener: (listener: EventListenerOrEventListenerObject): void => {
      listeners.delete(listener);
    },
    dispatchEvent: (): boolean => false,
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn(() => mediaQueryList),
  });
}

function createStore(): ReturnType<typeof createUserSettingsStore> {
  return createUserSettingsStore(
    {
      getByUserId: async () => UserSettings.create({ userId: USER_ID, theme: 'light' }),
      upsert: async (settings) => settings,
    },
    ENVIRONMENT,
  );
}

function installFaviconLinks(): { link16: HTMLLinkElement; link32: HTMLLinkElement } {
  const create = (size: 16 | 32): HTMLLinkElement => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.setAttribute('sizes', `${size}x${size}`);
    link.href = `/brand/favicon-light-${size}.png`;
    link.dataset.appFavicon = String(size);
    link.dataset.testFavicon = 'true';
    document.head.append(link);
    return link;
  };
  return { link16: create(16), link32: create(32) };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.querySelectorAll('link[data-test-favicon]').forEach((link) => link.remove());
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe('theme favicon integration', () => {
  it('updates the favicon when the account theme changes in settings', async () => {
    installMatchMedia(false);
    const { link16, link32 } = installFaviconLinks();
    const user = userEvent.setup();

    render(
      <UserSettingsProvider store={createStore()} userId={USER_ID}>
        <SettingsControls />
      </UserSettingsProvider>,
    );

    const themeSelect = await screen.findByRole('combobox', { name: 'Theme' });
    await waitFor(() => expect(themeSelect).toBeEnabled());

    await user.click(themeSelect);
    await user.click(screen.getByRole('option', { name: 'Dark' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(link16).toHaveAttribute('href', '/brand/favicon-dark-16.png');
    expect(link32).toHaveAttribute('href', '/brand/favicon-dark-32.png');

    await user.click(screen.getByRole('combobox', { name: 'Theme' }));
    await user.click(screen.getByRole('option', { name: 'Light' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
    expect(link16).toHaveAttribute('href', '/brand/favicon-light-16.png');
    expect(link32).toHaveAttribute('href', '/brand/favicon-light-32.png');
  });
});
