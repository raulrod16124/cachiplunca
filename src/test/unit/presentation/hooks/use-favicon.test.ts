import {
  applyFavicon,
  faviconHref,
  type FaviconSize,
  type FaviconTheme,
} from '../../../../presentation/hooks/use-favicon';
import { setPublicBasePath } from '../../../../presentation/config/public-base';

function installFaviconLink(
  size: FaviconSize,
  theme: FaviconTheme,
  media: string | null,
): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.setAttribute('sizes', `${size}x${size}`);
  link.href = `/brand/favicon-${theme}-${size}.png`;
  link.dataset.appFavicon = String(size);
  if (media !== null) {
    link.media = media;
  }
  document.head.append(link);
  return link;
}

function removeTestLinks(): void {
  document.querySelectorAll('link[data-test-favicon]').forEach((link) => link.remove());
}

afterEach(() => {
  removeTestLinks();
  setPublicBasePath('/');
});

describe('faviconHref', () => {
  it('builds the branded favicon URL from the public base path', () => {
    expect(faviconHref('dark', 32)).toBe('/brand/favicon-dark-32.png');
    expect(faviconHref('light', 16)).toBe('/brand/favicon-light-16.png');
  });

  it('keeps a non-root deployment base path', () => {
    setPublicBasePath('/cachiplunca/');

    expect(faviconHref('dark', 32)).toBe('/cachiplunca/brand/favicon-dark-32.png');
    expect(faviconHref('light', 16)).toBe('/cachiplunca/brand/favicon-light-16.png');
  });
});

describe('applyFavicon', () => {
  it('points every marked size at the resolved theme', () => {
    const link16 = installFaviconLink(16, 'light', '(prefers-color-scheme: light)');
    const link32 = installFaviconLink(32, 'light', '(prefers-color-scheme: light)');
    link16.dataset.testFavicon = 'true';
    link32.dataset.testFavicon = 'true';

    applyFavicon('dark');

    expect(link16).toHaveAttribute('href', '/brand/favicon-dark-16.png');
    expect(link32).toHaveAttribute('href', '/brand/favicon-dark-32.png');
    expect(link16).toHaveAttribute('media', 'all');
    expect(link32).toHaveAttribute('media', 'all');
  });

  it('uses the deployment base path', () => {
    setPublicBasePath('/cachiplunca/');
    const link32 = installFaviconLink(32, 'light', '(prefers-color-scheme: light)');
    link32.dataset.testFavicon = 'true';

    applyFavicon('dark');

    expect(link32).toHaveAttribute('href', '/cachiplunca/brand/favicon-dark-32.png');
  });

  it('leaves icon links without the marker untouched', () => {
    const legacy = document.createElement('link');
    legacy.rel = 'icon';
    legacy.href = '/brand/favicon.ico';
    document.head.append(legacy);

    applyFavicon('dark');

    expect(legacy).toHaveAttribute('href', '/brand/favicon.ico');
    expect(legacy).not.toHaveAttribute('media');

    legacy.remove();
  });

  it('leaves unknown marker sizes untouched', () => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/brand/favicon-light-48.png';
    link.dataset.appFavicon = '48';
    link.dataset.testFavicon = 'true';
    document.head.append(link);

    applyFavicon('dark');

    expect(link).toHaveAttribute('href', '/brand/favicon-light-48.png');
    expect(link).not.toHaveAttribute('media');
  });
});
