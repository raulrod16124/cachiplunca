import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { SessionState, SessionStore } from '../../application/services';

const SessionContext = createContext<SessionState | null>(null);

export interface SessionProviderProps {
  readonly store: SessionStore;
  readonly children: ReactNode;
}

export function SessionProvider({ store, children }: SessionProviderProps): ReactNode {
  const session = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const session = useContext(SessionContext);

  if (session === null) {
    throw new Error('useSession must be used within a SessionProvider.');
  }

  return session;
}
