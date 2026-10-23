import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');
const FONTS_CSS = readFileSync(
  path.resolve(ROOT, 'src/presentation/styles/brand/fonts.css'),
  'utf8',
);

const FONT_FILES = [
  'public/fonts/inter/inter-variable-latin.woff2',
  'public/fonts/bangers/bangers-regular-latin.woff2',
  'public/fonts/outfit/outfit-variable-latin.woff2',
  'public/fonts/jetbrains-mono/jetbrains-mono-variable-latin.woff2',
] as const;

describe('brand fonts', () => {
  it('declares self-hosted Inter, Bangers, Outfit and JetBrains Mono faces', () => {
    expect(FONTS_CSS.match(/@font-face/g)).toHaveLength(4);
    expect(FONTS_CSS).toContain("font-family: 'Inter'");
    expect(FONTS_CSS).toContain("font-family: 'Bangers'");
    expect(FONTS_CSS).toContain("font-family: 'Outfit'");
    expect(FONTS_CSS).toContain("font-family: 'JetBrains Mono'");
  });

  it('uses font-display swap for every face', () => {
    expect(FONTS_CSS.match(/font-display: swap/g)).toHaveLength(4);
  });

  it('references local font files and no external font hosts', () => {
    expect(FONTS_CSS).toContain("url('/fonts/inter/inter-variable-latin.woff2')");
    expect(FONTS_CSS).toContain("url('/fonts/bangers/bangers-regular-latin.woff2')");
    expect(FONTS_CSS).toContain("url('/fonts/outfit/outfit-variable-latin.woff2')");
    expect(FONTS_CSS).toContain("url('/fonts/jetbrains-mono/jetbrains-mono-variable-latin.woff2')");
    expect(FONTS_CSS).not.toMatch(/https?:\/\//);
  });

  it('ships the declared font files', () => {
    for (const file of FONT_FILES) {
      expect(statSync(path.resolve(ROOT, file)).size).toBeGreaterThan(0);
    }
  });
});
