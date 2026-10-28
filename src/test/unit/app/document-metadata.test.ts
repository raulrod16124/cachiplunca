import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function read(relative: string): string {
  return readFileSync(path.resolve(ROOT, relative), 'utf8');
}

describe('document metadata', () => {
  it('uses the product name as the base title', () => {
    const html = read('index.html');

    expect(html).toContain('<title>Cachiplunca</title>');
    expect(html).not.toContain('<title>cachiplunca</title>');
  });

  it('resolves the theme favicons through the Vite base URL', () => {
    const html = read('index.html');

    expect(html).toContain('href="%BASE_URL%brand/favicon-light-32.png"');
    expect(html).toContain('href="%BASE_URL%brand/favicon-dark-32.png"');
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    expect(html).toContain('href="%BASE_URL%brand/apple-touch-icon.png"');
    expect(html).not.toContain('href="/favicon.svg"');
  });

  it('marks both theme favicon sizes for runtime updates', () => {
    const html = read('index.html');

    expect(html.match(/data-app-favicon="16"/g)).toHaveLength(2);
    expect(html.match(/data-app-favicon="32"/g)).toHaveLength(2);

    for (const theme of ['light', 'dark']) {
      for (const size of [16, 32]) {
        expect(html).toMatch(
          new RegExp(
            `href="%BASE_URL%brand/favicon-${theme}-${size}\\.png"[^>]*data-app-favicon="${size}"`,
          ),
        );
      }
    }
  });

  it('ships non-empty PNG favicons', () => {
    const favicons = [
      'public/brand/favicon-light-16.png',
      'public/brand/favicon-light-32.png',
      'public/brand/favicon-dark-16.png',
      'public/brand/favicon-dark-32.png',
      'public/brand/apple-touch-icon.png',
    ];

    for (const favicon of favicons) {
      const file = readFileSync(path.resolve(ROOT, favicon));
      expect(statSync(path.resolve(ROOT, favicon)).size).toBeGreaterThan(0);
      expect(file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
    }
  });
});
