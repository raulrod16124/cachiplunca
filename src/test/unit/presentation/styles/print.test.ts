import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');
const INDEX_CSS = readFileSync(path.resolve(ROOT, 'src/index.css'), 'utf8');
const PRINT_VIEW = readFileSync(
  path.resolve(ROOT, 'src/presentation/features/workspace-shell/components/board-print-view.tsx'),
  'utf8',
);

function printBlock(css: string): string {
  const start = css.indexOf('@media print');

  return start === -1 ? '' : css.slice(start);
}

describe('print styles', () => {
  it('prints only the board snapshot with the A4 landscape page contract', () => {
    const block = printBlock(INDEX_CSS);

    expect(block).not.toBe('');
    expect(block).toContain('@page');
    expect(block).toContain('size: A4 landscape;');
    expect(block).toContain('#root');
    expect(block).toContain('display: none !important;');
    expect(block).toContain('.board-print-root');
    expect(block).toContain('display: block !important;');
    expect(block).toContain('-webkit-print-color-adjust: exact;');
    expect(block).toContain('print-color-adjust: exact;');
  });

  it('forces the light brand palette when the app is in dark mode', () => {
    const block = printBlock(INDEX_CSS);

    expect(block).toContain(':root[data-theme]');
    expect(block).toContain(':root:not([data-theme])');
    expect(block).toContain('color-scheme: light;');
    expect(block).toContain('--rr-color-background-surface: var(--cach-cream-0);');
    expect(block).toContain('--rr-color-text-primary: var(--cach-graphite-900);');
    expect(block).toContain('--rr-color-border-strong: var(--cach-brown-700);');
    expect(block).toContain('--cach-note-default: #fffdf9;');
    expect(block).toContain('--cach-note-green: #dce8cf;');
    expect(block).toContain('--cach-note-shadow: none;');
  });

  it('keeps the print view free from hardcoded colors', () => {
    expect(PRINT_VIEW).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
