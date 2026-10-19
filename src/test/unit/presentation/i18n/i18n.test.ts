import { formatRelativeDate } from '../../../../presentation/i18n/format';
import {
  localizeMessage,
  resolveLocale,
  translate,
  type I18nContextValue,
} from '../../../../presentation/i18n';

describe('i18n', () => {
  it('interpolates parameters and falls back to the original template', () => {
    expect(
      translate('en', 'workspaces.pending.invited', { workspace: 'Plan', role: 'editor' }),
    ).toBe('Plan invited you as editor');
    expect(
      translate('es', 'workspaces.pending.invited', { workspace: 'Plan', role: 'editor' }),
    ).toBe('Plan te invitó como editor');
  });

  it('localizes known presentation error messages and keeps unknown ones intact', () => {
    const t = ((key: Parameters<I18nContextValue['t']>[0]) =>
      translate('es', key)) as I18nContextValue['t'];
    expect(localizeMessage(t, 'Email or password is incorrect.')).toBe(
      'El email o la contraseña no son correctos.',
    );
    expect(localizeMessage(t, 'Unknown provider message.')).toBe('Unknown provider message.');
  });

  it('resolves an explicit locale before the system preference', () => {
    expect(resolveLocale('es', ['en-US'])).toBe('es');
    expect(resolveLocale('en', ['es-ES'])).toBe('en');
    expect(resolveLocale('system', ['es-ES', 'en-US'])).toBe('es');
    expect(resolveLocale('system', ['fr-FR'])).toBe('en');
    expect(resolveLocale(null)).toBe('en');
  });

  it('formats relative dates in the active locale', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(formatRelativeDate(new Date('2026-10-19T11:58:00Z'), 'en', now)).toBe('2 minutes ago');
    expect(formatRelativeDate(new Date('2026-10-14T12:00:00Z'), 'es', now)).toBe('hace 5 días');
  });
});
