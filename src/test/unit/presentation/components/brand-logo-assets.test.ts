import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const PNG_ASSETS = [
  'public/brand/light_theme_logo_cachiplunca.png',
  'public/brand/dark_theme_logo_cachiplunca.png',
  'public/brand/light_theme_logo_reducido_cachiplunca.png',
  'public/brand/dark_theme_logo_reducido_cachiplunca.png',
  'public/brand/favicon-light-16.png',
  'public/brand/favicon-light-32.png',
  'public/brand/favicon-dark-16.png',
  'public/brand/favicon-dark-32.png',
  'public/brand/apple-touch-icon.png',
] as const;

function read(relative: string): Buffer {
  return readFileSync(path.resolve(ROOT, relative));
}

function dimensions(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe('brand logo assets', () => {
  it('ships every brand PNG with real content and a valid signature', () => {
    for (const asset of PNG_ASSETS) {
      const file = read(asset);
      expect(statSync(path.resolve(ROOT, asset)).size).toBeGreaterThan(0);
      expect(file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
    }
  });

  it('ships the same wordmark aspect for both themes', () => {
    const light = dimensions(read('public/brand/light_theme_logo_cachiplunca.png'));
    const dark = dimensions(read('public/brand/dark_theme_logo_cachiplunca.png'));

    expect(light).toEqual(dark);
    expect(light.width / light.height).toBeGreaterThan(2);
  });

  it('ships square reduced marks for the browser tab', () => {
    for (const theme of ['light', 'dark'] as const) {
      const reduced = dimensions(read(`public/brand/${theme}_theme_logo_reducido_cachiplunca.png`));
      const favicon16 = dimensions(read(`public/brand/favicon-${theme}-16.png`));
      const favicon32 = dimensions(read(`public/brand/favicon-${theme}-32.png`));

      expect(reduced.width).toBe(reduced.height);
      expect(favicon16).toEqual({ width: 16, height: 16 });
      expect(favicon32).toEqual({ width: 32, height: 32 });
    }
  });

  it('ships a legacy favicon.ico fallback', () => {
    const ico = read('public/brand/favicon.ico');

    expect(ico.length).toBeGreaterThan(0);
    expect([...ico.subarray(0, 4)]).toEqual([0x00, 0x00, 0x01, 0x00]);
  });
});
