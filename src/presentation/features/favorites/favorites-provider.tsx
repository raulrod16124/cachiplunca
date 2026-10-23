import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Outlet } from 'react-router-dom';
import type { FavoriteServices } from '../../../application/favorite-services';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';

export type FavoritesLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FavoritesContextValue {
  readonly status: FavoritesLoadStatus;
  readonly favoriteWorkspaceIds: ReadonlySet<string>;
  readonly pendingWorkspaceIds: ReadonlySet<string>;
  readonly loadError: string | null;
  readonly actionError: string | null;
  readonly toggleFavorite: (workspaceId: string) => void;
  readonly retry: () => void;
}

const EMPTY_IDS: ReadonlySet<string> = new Set();

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export interface FavoritesProviderProps {
  readonly services?: FavoriteServices;
}

export function FavoritesProvider({ services }: FavoritesProviderProps): ReactNode {
  const session = useSession();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const userId = session.status === 'authenticated' ? session.user.uid : null;
  const [status, setStatus] = useState<FavoritesLoadStatus>('idle');
  const [favoriteWorkspaceIds, setFavoriteWorkspaceIds] = useState<ReadonlySet<string>>(EMPTY_IDS);
  const [pendingWorkspaceIds, setPendingWorkspaceIds] = useState<ReadonlySet<string>>(EMPTY_IDS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setActionError(null);

    if (userId === null || services === undefined) {
      setFavoriteWorkspaceIds(EMPTY_IDS);
      setPendingWorkspaceIds(EMPTY_IDS);
      setLoadError(null);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('loading');
    setLoadError(null);

    void (async () => {
      try {
        const result = await services.listFavorites(userId);
        if (!active) {
          return;
        }

        if (result.status === 'error') {
          setFavoriteWorkspaceIds(EMPTY_IDS);
          setLoadError(tRef.current('favorites.error.load'));
          setStatus('error');
          return;
        }

        setFavoriteWorkspaceIds(
          new Set(result.favorites.map((favorite) => favorite.workspaceId.value)),
        );
        setStatus('ready');
      } catch {
        if (!active) {
          return;
        }
        setFavoriteWorkspaceIds(EMPTY_IDS);
        setLoadError(tRef.current('favorites.error.load'));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadToken, services, userId]);

  const toggleFavorite = useCallback(
    (workspaceId: string): void => {
      if (services === undefined || userId === null || pendingWorkspaceIds.has(workspaceId)) {
        return;
      }

      const wasFavorite = favoriteWorkspaceIds.has(workspaceId);
      setActionError(null);
      setFavoriteWorkspaceIds((current) => withFavorite(current, workspaceId, !wasFavorite));
      setPendingWorkspaceIds((current) => withId(current, workspaceId));

      void (async () => {
        try {
          const result = await services.toggleFavorite({
            userId,
            workspaceId,
            favorited: !wasFavorite,
          });
          if (result.status === 'ok') {
            setFavoriteWorkspaceIds((current) =>
              withFavorite(current, workspaceId, result.favorited),
            );
          } else {
            setFavoriteWorkspaceIds((current) => withFavorite(current, workspaceId, wasFavorite));
            setActionError(tRef.current('favorites.error.toggle'));
          }
        } catch {
          setFavoriteWorkspaceIds((current) => withFavorite(current, workspaceId, wasFavorite));
          setActionError(tRef.current('favorites.error.toggle'));
        } finally {
          setPendingWorkspaceIds((current) => withoutId(current, workspaceId));
        }
      })();
    },
    [favoriteWorkspaceIds, pendingWorkspaceIds, services, userId],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      status,
      favoriteWorkspaceIds,
      pendingWorkspaceIds,
      loadError,
      actionError,
      toggleFavorite,
      retry: () => setReloadToken((token) => token + 1),
    }),
    [actionError, favoriteWorkspaceIds, loadError, pendingWorkspaceIds, status, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      <Outlet />
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);

  if (value === null) {
    throw new Error('useFavorites must be used within a FavoritesProvider.');
  }

  return value;
}

function withFavorite(
  current: ReadonlySet<string>,
  workspaceId: string,
  favorited: boolean,
): ReadonlySet<string> {
  const next = new Set(current);
  if (favorited) {
    next.add(workspaceId);
  } else {
    next.delete(workspaceId);
  }
  return next;
}

function withId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);
  next.add(id);
  return next;
}

function withoutId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);
  next.delete(id);
  return next;
}
