import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../../../../setup/render-with-theme';
import type { SystemEnvironment, UserSettingsRepository } from '../../../../../application/ports';
import {
  createUserSettingsStore,
  type UserSettingsStore,
} from '../../../../../application/services/user-settings-store';
import { UserSettings } from '../../../../../domain/user-settings';
import { UserId } from '../../../../../domain/shared';
import { UserSettingsProvider } from '../../../../../presentation/providers/user-settings-provider';
import { SettingsModal } from '../../../../../presentation/features/settings/settings-modal';

const USER_ID = UserId.create('user-1');

const TEST_ENVIRONMENT: SystemEnvironment = {
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

function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createRepository(settings: UserSettings | null): UserSettingsRepository & {
  readonly upserts: UserSettings[];
} {
  const upserts: UserSettings[] = [];
  return {
    upserts,
    async getByUserId(): Promise<UserSettings | null> {
      return settings;
    },
    async upsert(next: UserSettings): Promise<UserSettings> {
      upserts.push(next);
      return next;
    },
  };
}

function renderModal(store: UserSettingsStore): HTMLElement {
  render(
    <UserSettingsProvider store={store} userId={USER_ID}>
      <SettingsModal open onOpenChange={() => undefined} />
    </UserSettingsProvider>,
  );
  return screen.getByRole('dialog');
}

describe('SettingsModal', () => {
  it('raises the theme listbox above the dialog overlay', async () => {
    const store = createUserSettingsStore(createRepository(null), TEST_ENVIRONMENT);
    renderModal(store);

    const trigger = await screen.findByRole('combobox', { name: 'Theme' });
    await waitFor(() => expect(trigger).toBeEnabled());

    fireEvent.click(trigger);

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toHaveClass('settings-select-content');
  });

  it('persists the selected theme', async () => {
    const repository = createRepository(UserSettings.create({ userId: USER_ID }));
    const store = createUserSettingsStore(repository, TEST_ENVIRONMENT);
    renderModal(store);

    const trigger = await screen.findByRole('combobox', { name: 'Theme' });
    await waitFor(() => expect(trigger).toBeEnabled());

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Dark' }));

    await waitFor(() => expect(repository.upserts.at(-1)?.theme).toBe('dark'));
  });

  it('associates each control with its helper text', async () => {
    const store = createUserSettingsStore(createRepository(null), TEST_ENVIRONMENT);
    renderModal(store);

    const theme = await screen.findByRole('combobox', { name: 'Theme' });
    expect(theme).toHaveAccessibleDescription('Choose light, dark, or match your system.');
    expect(screen.getByRole('combobox', { name: 'Font size' })).toHaveAccessibleDescription(
      'Choose the text size that feels most comfortable.',
    );
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toHaveAccessibleDescription(
      'Reduce animations and transitions across the app.',
    );
  });

  it('disables the controls while settings are still loading', async () => {
    const pending = deferred<UserSettings | null>();
    const store = createUserSettingsStore(
      {
        getByUserId: () => pending.promise,
        upsert: async (next) => next,
      },
      TEST_ENVIRONMENT,
    );
    renderModal(store);

    expect(screen.getByRole('combobox', { name: 'Theme' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeDisabled();

    pending.resolve(null);
  });
});
