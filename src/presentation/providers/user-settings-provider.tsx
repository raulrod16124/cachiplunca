import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  UserSettingsStore,
  UserSettingsState,
} from '../../application/services/user-settings-store';
import type { UserSettings } from '../../domain/user-settings';
import type { UserId } from '../../domain/shared/value-objects/user-id';
import { useThemeMode } from '../hooks/use-theme-mode';

export interface UserSettingsContextValue {
  readonly state: UserSettingsState;
  readonly settings: UserSettings | null;
  readonly update: UserSettingsStore['update'];
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export interface UserSettingsProviderProps {
  readonly store: UserSettingsStore;
  readonly userId: UserId | null;
  readonly children: ReactNode;
}

export function UserSettingsProvider({
  store,
  userId,
  children,
}: UserSettingsProviderProps): ReactNode {
  const [state, setState] = useState<UserSettingsState>(store.getSnapshot());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(store.getSnapshot());
    });
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    if (userId === null) {
      return;
    }
    void store.load(userId);
  }, [store, userId]);

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      state,
      settings: state.status === 'ready' ? state.settings : null,
      update: store.update.bind(store),
    }),
    [state, store],
  );

  return (
    <UserSettingsContext.Provider value={value}>
      <ThemeSync />
      {children}
    </UserSettingsContext.Provider>
  );
}

/**
 * Keeps `<html>` in sync with the account theme/locale. Lives inside the
 * provider so it can read the settings context without an ordering hazard.
 */
function ThemeSync(): ReactNode {
  useThemeMode();
  return null;
}

export function useUserSettings(): UserSettingsContextValue {
  const context = useContext(UserSettingsContext);
  if (context === null) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return context;
}
