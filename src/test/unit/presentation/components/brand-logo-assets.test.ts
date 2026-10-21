import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');

const BRAND_ASSETS = [
  'public/brand/logo-wordmark.svg',
  'public/brand/logo-compact.svg',
  'public/brand/isotipo.svg',
  'public/favicon.svg',
] as const;

function read(relative: string): string {
  return readFileSync(path.resolve(ROOT, relative), 'utf8');
}

describe('brand logo assets', () => {
  it('ships every brand asset with real content', () => {
    for (const asset of BRAND_ASSETS) {
      expect(statSync(path.resolve(ROOT, asset)).size).toBeGreaterThan(0);
      const svg = read(asset);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('aria-label="Cachiplunca"');
    }
  });

  it('replaces the Vite template favicon with the brand isotype', () => {
    const favicon = read('public/favicon.svg');

    expect(favicon).not.toContain('#863bff');
    expect(favicon).toContain('#173e2c');
    expect(favicon).toContain('#ff7a2f');
  });

  it('keeps the isotype in brand colors', () => {
    const isotipo = read('public/brand/isotipo.svg');

    expect(isotipo).toContain('#173e2c');
    expect(isotipo).toContain('#ff7a2f');
    expect(isotipo).toContain('#ffb400');
  });

  it('renders the wordmark and compact lockups with the self-hosted display font', () => {
    const wordmark = read('public/brand/logo-wordmark.svg');
    const compact = read('public/brand/logo-compact.svg');

    expect(wordmark).toContain('Bangers');
    expect(compact).toContain('Bangers');
    expect(wordmark).toContain('CACHIPLUNCA');
    expect(compact).toContain('CACHIPLUNCA');
    expect(wordmark).toContain('#ff7a2f');
    expect(compact).not.toContain('#ff7a2f');
    expect(wordmark).toContain('url(data:font/woff2;base64,');
    expect(compact).toContain('url(data:font/woff2;base64,');
    expect(wordmark).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    expect(compact).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });
});
