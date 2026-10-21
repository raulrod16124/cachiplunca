import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SystemEnvironment, UserSettingsRepository } from '../../../../application/ports';
import {
  createUserSettingsStore,
  type UserSettingsStore,
} from '../../../../application/services/user-settings-store';
import { UserSettings } from '../../../../domain/user-settings';
import { UserId } from '../../../../domain/shared';
import { useThemeMode } from '../../../../presentation/hooks/use-theme-mode';
import { UserSettingsProvider } from '../../../../presentation/providers/user-settings-provider';

const USER_ID = UserId.create('user-1');

const TEST_ENVIRONMENT: SystemEnvironment = {
  getReducedMotionPref: () => false,
  getLanguages: () => ['en-US'],
};

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-font-size');
  root.removeAttribute('data-reduced-motion');
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
});
