import { getPublicBasePath } from '../config/public-base';

export type FaviconTheme = 'light' | 'dark';

export type FaviconSize = 16 | 32;

const FAVICON_SELECTOR = 'link[rel="icon"][data-app-favicon]';

function faviconSize(value: string | undefined): FaviconSize | null {
  if (value === '16') return 16;
  if (value === '32') return 32;
  return null;
}

/**
 * Builds the branded favicon URL for the resolved theme and size, honouring the
 * deployment base path (`BASE_PATH`).
 */
export function faviconHref(theme: FaviconTheme, size: FaviconSize): string {
  const base = getPublicBasePath().replace(/\/$/, '');
  return `${base}/brand/favicon-${theme}-${size}.png`;
}

/**
 * Points every theme-aware `<link rel="icon">` at the resolved theme. The
 * `media` queries in `index.html` remain the pre-hydration fallback; once React
 * mounts, the app theme wins over the OS preference. Idempotent and safe to
 * call on every theme change.
 */
export function applyFavicon(theme: FaviconTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const links = document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR);
  for (const link of links) {
    const size = faviconSize(link.dataset.appFavicon);
    if (size === null) {
      continue;
    }
    link.setAttribute('href', faviconHref(theme, size));
    link.setAttribute('media', 'all');
  }
}
