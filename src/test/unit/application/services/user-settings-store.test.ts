import {
  createUserSettingsStore,
  resolveLocale,
  type UserSettingsState,
} from '../../../../application/services/user-settings-store';
import type { UserSettingsRepository } from '../../../../application/ports';
import { UserSettings } from '../../../../domain/user-settings';
import { UserId } from '../../../../domain/shared';

const USER_ID = UserId.create('user-1');

class FakeUserSettingsRepository implements UserSettingsRepository {
  public stored: UserSettings | null = null;
  public upserts: UserSettings[] = [];

  async getByUserId(_userId: UserId): Promise<UserSettings | null> {
    return this.stored;
  }

  async upsert(settings: UserSettings): Promise<UserSettings> {
    this.stored = settings;
    this.upserts.push(settings);
    return settings;
  }
}

function ready(state: UserSettingsState): UserSettings {
  if (state.status !== 'ready') {
    throw new Error(`Expected ready state, received ${state.status}`);
  }
  return state.settings;
}

describe('createUserSettingsStore', () => {
  it('starts in the loading state', () => {
    const store = createUserSettingsStore(new FakeUserSettingsRepository());

    expect(store.getSnapshot()).toEqual({ status: 'loading' });
  });

  it('creates and persists defaults when the account has no settings', async () => {
    const repository = new FakeUserSettingsRepository();
    const store = createUserSettingsStore(repository);

    await store.load(USER_ID);

    const settings = ready(store.getSnapshot());
    expect(settings.theme).toBe('system');
    expect(settings.fontSize).toBe('base');
    expect(settings.locale).toBe('system');
    expect(repository.upserts).toHaveLength(1);
  });

  it('loads stored settings without overwriting them', async () => {
    const repository = new FakeUserSettingsRepository();
    repository.stored = UserSettings.create({ userId: USER_ID, theme: 'dark' });
    const store = createUserSettingsStore(repository);

    await store.load(USER_ID);

    expect(ready(store.getSnapshot()).theme).toBe('dark');
    expect(repository.upserts).toHaveLength(0);
  });

  it('notifies subscribers when settings change', async () => {
    const store = createUserSettingsStore(new FakeUserSettingsRepository());
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.load(USER_ID);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await store.update({ theme: 'dark' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('applies and persists updates with an incremented version', async () => {
    const repository = new FakeUserSettingsRepository();
    const store = createUserSettingsStore(repository);
    await store.load(USER_ID);

    await store.update({ theme: 'dark', fontSize: 'lg' });

    const settings = ready(store.getSnapshot());
    expect(settings.theme).toBe('dark');
    expect(settings.fontSize).toBe('lg');
    expect(settings.version).toBe(2);
    expect(repository.upserts).toHaveLength(2);
  });

  it('ignores updates before any account is loaded', async () => {
    const repository = new FakeUserSettingsRepository();
    const store = createUserSettingsStore(repository);

    await store.update({ theme: 'dark' });

    expect(repository.upserts).toHaveLength(0);
    expect(store.getSnapshot()).toEqual({ status: 'loading' });
  });

  it('does not persist a no-op update', async () => {
    const repository = new FakeUserSettingsRepository();
    const store = createUserSettingsStore(repository);
    await store.load(USER_ID);

    await store.update({ theme: 'system' });

    expect(repository.upserts).toHaveLength(1);
    expect(ready(store.getSnapshot()).version).toBe(1);
  });

  it('surfaces a load failure as an error state', async () => {
    const repository: UserSettingsRepository = {
      getByUserId: async () => {
        throw new Error('offline');
      },
      upsert: async (settings) => settings,
    };
    const store = createUserSettingsStore(repository);

    await store.load(USER_ID);

    expect(store.getSnapshot()).toEqual({
      status: 'error',
      error: new Error('offline'),
    });
  });
});

describe('resolveLocale', () => {
  it('returns the explicit locale without detection', () => {
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('en')).toBe('en');
  });

  it('falls back to the browser language when set to system', () => {
    const original = navigator.languages;
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['es-ES', 'en-US'],
    });

    expect(resolveLocale('system')).toBe('es');

    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: original,
    });
  });
});
