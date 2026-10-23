import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');

function read(relative: string): string {
  return readFileSync(path.resolve(ROOT, relative), 'utf8');
}

describe('document metadata', () => {
  it('uses the product name as the base title', () => {
    const html = read('index.html');

    expect(html).toContain('<title>Cachiplunca</title>');
    expect(html).not.toContain('<title>cachiplunca</title>');
  });

  it('resolves the favicon through the Vite base URL', () => {
    const html = read('index.html');

    expect(html).toContain('href="%BASE_URL%favicon.svg"');
    expect(html).not.toContain('href="/favicon.svg"');
  });

  it('ships a non-empty SVG favicon', () => {
    expect(statSync(path.resolve(ROOT, 'public/favicon.svg')).size).toBeGreaterThan(0);

    const favicon = read('public/favicon.svg');
    expect(favicon).toContain('<svg');
    expect(favicon).toContain('aria-label="Cachiplunca"');
  });
});
