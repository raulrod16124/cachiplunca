import type { SystemEnvironment } from '../../application/ports';

export function createBrowserSystemEnvironment(): SystemEnvironment {
  return {
    getReducedMotionPref: () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
      }
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        return false;
      }
    },
    getLanguages: () => {
      if (typeof navigator === 'undefined') {
        return [];
      }
      return navigator.languages ?? [navigator.language];
    },
  };
}
