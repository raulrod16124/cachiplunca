import { formatCalendarDate, formatRelativeDate } from '../../../../presentation/i18n/format';
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

  it('translates accessible text-format and canvas labels', () => {
    expect(translate('en', 'canvas.textFormat.bold')).toBe('Bold');
    expect(translate('es', 'canvas.textFormat.bold')).toBe('Negrita');
    expect(translate('es', 'canvas.textFormat.colorOptions', { label: 'Color de fuente' })).toBe(
      'Opciones de Color de fuente',
    );
    expect(translate('es', 'canvas.zoomLevelAdjust', { percent: 75 })).toBe(
      'Nivel de zoom 75%, ajustar',
    );
    expect(translate('es', 'share.roleFor', { name: 'ana' })).toBe('Rol de ana');
    expect(translate('en', 'share.roleFor', { name: 'ana' })).toBe('Role for ana');
    expect(translate('en', 'workspaces.card.favorite.add')).toBe('Add to favorites');
    expect(translate('es', 'workspaces.card.favorite.add')).toBe('Añadir a favoritos');
    expect(translate('es', 'workspaces.card.favorite.remove')).toBe('Quitar de favoritos');
    expect(translate('en', 'shell.nav.favorites')).toBe('Favorites');
    expect(translate('es', 'shell.nav.favorites')).toBe('Favoritos');
    expect(translate('en', 'favorites.title')).toBe('Favorites');
    expect(translate('es', 'favorites.empty.action')).toBe('Ver todos los tableros');
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

  it('formats calendar dates without shifting the UTC day', () => {
    expect(formatCalendarDate(new Date('2026-03-15T00:00:00.000Z'), 'en')).toBe('Mar 15, 2026');
    expect(formatCalendarDate(new Date('2026-03-15T00:00:00.000Z'), 'es')).toContain('2026');
  });
});
