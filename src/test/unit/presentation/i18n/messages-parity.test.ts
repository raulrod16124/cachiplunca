import { MESSAGES, type AppLocale } from '../../../../presentation/i18n';

const LOCALES: readonly AppLocale[] = ['en', 'es'];

describe('i18n message catalog', () => {
  it('defines exactly the same keys in English and Spanish', () => {
    const enKeys = Object.keys(MESSAGES.en).sort();
    const esKeys = Object.keys(MESSAGES.es).sort();

    expect(esKeys).toEqual(enKeys);
  });

  it.each(LOCALES)('has a non-empty value for every key in %s', (locale) => {
    const entries = Object.entries(MESSAGES[locale]);

    expect(entries.length).toBeGreaterThan(0);

    const empty = entries
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it('keeps the keys touched by the visible-text audit in sync', () => {
    const auditedKeys = [
      'loadingScreen.default',
      'session.restoring',
      'common.emptyTitle',
      'common.dismiss',
      'common.tryAgain',
      'canvas.linkUrlPlaceholder',
      'errors.invalidRole',
      'shortcuts.selection.bringToFront',
      'shortcuts.selection.sendToBack',
    ] as const;

    for (const key of auditedKeys) {
      expect(MESSAGES.en[key].trim()).not.toBe('');
      expect(MESSAGES.es[key].trim()).not.toBe('');
    }
  });

  it('uses the same interpolation placeholders in both locales', () => {
    const placeholders = (value: string): readonly string[] =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    const mismatched = Object.keys(MESSAGES.en).filter((key) => {
      const en = MESSAGES.en[key as keyof typeof MESSAGES.en];
      const es = MESSAGES.es[key as keyof typeof MESSAGES.es];
      return placeholders(en).join(',') !== placeholders(es).join(',');
    });

    expect(mismatched).toEqual([]);
  });
});
