import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SystemEnvironment, UserSettingsRepository } from '../../../../application/ports';
import {
  createUserSettingsStore,
  type UserSettingsStore,
} from '../../../../application/services/user-settings-store';
import { setPublicBasePath } from '../../../../presentation/config/public-base';
import { UserSettings } from '../../../../domain/user-settings';
import { UserId } from '../../../../domain/shared';
import { useThemeMode } from '../../../../presentation/hooks/use-theme-mode';
import { UserSettingsProvider } from '../../../../presentation/providers/user-settings-provider';

const USER_ID = UserId.create('user-1');

const TEST_ENVIRONMENT: SystemEnvironment = {
  getReducedMotionPref: () => false,
  getLanguages: () => ['en-US'],
};

interface MediaController {
  setMatches(matches: boolean): void;
  listenerCount(): number;
  restore(): void;
}

const originalMatchMedia = window.matchMedia;
let activeMedia: MediaController | null = null;

function installMatchMedia(initialMatches: boolean): MediaController {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  let currentMatches = initialMatches;
  const mediaQueryList = {
    get matches(): boolean {
      return currentMatches;
    },
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

  const controller: MediaController = {
    setMatches(matches: boolean): void {
      currentMatches = matches;
      for (const listener of listeners) {
        const event = { matches } as MediaQueryListEvent;
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      }
    },
    listenerCount(): number {
      return listeners.size;
    },
    restore(): void {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      activeMedia = null;
    },
  };
  activeMedia = controller;
  return controller;
}

function installFaviconLink(size: 16 | 32): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.setAttribute('sizes', `${size}x${size}`);
  link.href = `/brand/favicon-light-${size}.png`;
  link.dataset.appFavicon = String(size);
  link.dataset.testFavicon = 'true';
  document.head.append(link);
  return link;
}

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.removeAttribute('data-font-size');
  root.removeAttribute('data-reduced-motion');
  document.querySelectorAll('link[data-test-favicon]').forEach((link) => link.remove());
  setPublicBasePath('/');
  activeMedia?.restore();
});

function createStore(settings: UserSettings | null): UserSettingsStore {
  const repository: UserSettingsRepository = {
    async getByUserId(): Promise<UserSettings | null> {
      return settings;
    },
    async upsert(next: UserSettings): Promise<UserSettings> {
      return next;
    },
  };
  return createUserSettingsStore(repository, TEST_ENVIRONMENT);
}

function renderThemeMode(store: UserSettingsStore) {
  return renderHook(() => useThemeMode(), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <UserSettingsProvider store={store} userId={USER_ID}>
        {children}
      </UserSettingsProvider>
    ),
  });
}

describe('useThemeMode', () => {
  it('applies the account font size and motion preference to the document', async () => {
    const store = createStore(
      UserSettings.create({
        userId: USER_ID,
        theme: 'light',
        fontSize: 'lg',
        reducedMotion: true,
      }),
    );

    renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-font-size', 'lg');
    });
    expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
  });

  it('updates the document attributes when the preference changes', async () => {
    const store = createStore(
      UserSettings.create({
        userId: USER_ID,
        theme: 'light',
      }),
    );

    renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-font-size', 'base');
    });
    expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'false');

    await act(async () => {
      await store.update({ fontSize: 'xl', reducedMotion: true });
    });

    expect(document.documentElement).toHaveAttribute('data-font-size', 'xl');
    expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
  });

  it('uses the dark favicon when the app theme is dark and the OS is light', async () => {
    installMatchMedia(false);
    const link16 = installFaviconLink(16);
    const link32 = installFaviconLink(32);
    const store = createStore(UserSettings.create({ userId: USER_ID, theme: 'dark' }));

    renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(link16).toHaveAttribute('href', '/brand/favicon-dark-16.png');
    expect(link32).toHaveAttribute('href', '/brand/favicon-dark-32.png');
  });

  it('uses the light favicon when the app theme is light and the OS is dark', async () => {
    installMatchMedia(true);
    const link32 = installFaviconLink(32);
    const store = createStore(UserSettings.create({ userId: USER_ID, theme: 'light' }));

    renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
    expect(link32).toHaveAttribute('href', '/brand/favicon-light-32.png');
  });

  it('follows the OS preference and live changes in system mode', async () => {
    const media = installMatchMedia(true);
    const link32 = installFaviconLink(32);
    const store = createStore(UserSettings.create({ userId: USER_ID, theme: 'system' }));

    renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(link32).toHaveAttribute('href', '/brand/favicon-dark-32.png');

    act(() => {
      media.setMatches(false);
    });

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(link32).toHaveAttribute('href', '/brand/favicon-light-32.png');
  });

  it('removes the system listener when unmounted', async () => {
    const media = installMatchMedia(true);
    const store = createStore(UserSettings.create({ userId: USER_ID, theme: 'system' }));

    const { unmount } = renderThemeMode(store);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(media.listenerCount()).toBeGreaterThan(0);

    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it('builds the favicon URL with the deployment base path', async () => {
    setPublicBasePath('/cachiplunca/');
    const link32 = installFaviconLink(32);
    const store = createStore(UserSettings.create({ userId: USER_ID, theme: 'dark' }));

    renderThemeMode(store);

    await waitFor(() => {
      expect(link32).toHaveAttribute('href', '/cachiplunca/brand/favicon-dark-32.png');
    });
  });
});
