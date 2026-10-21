import {
  createPresenceColorAssigner,
  presenceColorFor,
  PRESENCE_COLOR_PALETTE,
} from '../../../../presentation/collaboration/presence-colors';
import { contrastRatio } from '../../../../presentation/styles/brand/brand-contrast';
import { brandPrimitives } from '../../../../presentation/styles/brand/brand-tokens';

describe('createPresenceColorAssigner', () => {
  it('keeps a stable color for the same user', () => {
    const assigner = createPresenceColorAssigner(['#111111', '#222222']);

    expect(assigner.colorFor('user-1')).toBe(assigner.colorFor('user-1'));
  });

  it('gives distinct colors to distinct users while the palette lasts', () => {
    const palette = ['#111111', '#222222', '#333333'];
    const assigner = createPresenceColorAssigner(palette);

    const colors = ['user-1', 'user-2', 'user-3'].map((userId) => assigner.colorFor(userId));

    expect(new Set(colors).size).toBe(3);
    expect(colors.every((color) => palette.includes(color))).toBe(true);
  });

  it('reuses the least-used color once the palette is exhausted', () => {
    const palette = ['#111111', '#222222'];
    const assigner = createPresenceColorAssigner(palette);

    assigner.colorFor('user-1');
    assigner.colorFor('user-2');
    const overflow = assigner.colorFor('user-3');

    expect(palette).toContain(overflow);
  });

  it('rejects an empty palette', () => {
    expect(() => createPresenceColorAssigner([])).toThrow(
      'Presence palette must contain at least one color',
    );
  });
});

describe('presenceColorFor', () => {
  it('is deterministic for the same user', () => {
    expect(presenceColorFor('user-1')).toBe(presenceColorFor('user-1'));
  });

  it('returns a palette color', () => {
    expect(PRESENCE_COLOR_PALETTE).toContain(presenceColorFor('user-1'));
  });
});

describe('PRESENCE_COLOR_PALETTE', () => {
  it('keeps every tone above AA contrast against cream text', () => {
    for (const color of PRESENCE_COLOR_PALETTE) {
      expect(contrastRatio(color, brandPrimitives['cream-0'])).toBeGreaterThanOrEqual(4.9);
    }
  });

  it('uses a warm pool between 12 and 16 distinguishable tones', () => {
    expect(PRESENCE_COLOR_PALETTE.length).toBeGreaterThanOrEqual(12);
    expect(PRESENCE_COLOR_PALETTE.length).toBeLessThanOrEqual(16);
    expect(new Set(PRESENCE_COLOR_PALETTE).size).toBe(PRESENCE_COLOR_PALETTE.length);
  });
});
