import { useEffect, useState } from 'react';

function matchesQuery(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/**
 * Tracks a CSS media query in React. Used by the AppShell to mount the narrow
 * navigation only when the sidebar collapses, so the trigger is not rendered
 * (nor focusable) on desktop. SSR/jsdom safe: falls back to `false` when
 * `window.matchMedia` is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchesQuery(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia(query);
    const update = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    setMatches(media.matches);
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
    };
  }, [query]);

  return matches;
}
