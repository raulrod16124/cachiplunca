import { UserSettings } from '../../../../domain/user-settings';
import { UserId } from '../../../../domain/shared';

const USER_ID = UserId.create('user-1');

describe('UserSettings', () => {
  describe('create', () => {
    it('applies sensible defaults for the account', () => {
      const before = Date.now();
      const settings = UserSettings.create({ userId: USER_ID });
      const after = Date.now();

      expect(settings.userId).toBe(USER_ID);
      expect(settings.theme).toBe('system');
      expect(settings.fontSize).toBe('base');
      expect(settings.locale).toBe('system');
      expect(settings.reducedMotion).toBe(false);
      expect(settings.version).toBe(1);
      expect(settings.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(settings.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('accepts explicit preferences', () => {
      const settings = UserSettings.create({
        userId: USER_ID,
        theme: 'dark',
        fontSize: 'lg',
        locale: 'es',
        reducedMotion: true,
        version: 3,
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      });

      expect(settings.theme).toBe('dark');
      expect(settings.fontSize).toBe('lg');
      expect(settings.locale).toBe('es');
      expect(settings.reducedMotion).toBe(true);
      expect(settings.version).toBe(3);
    });

    it('rejects an invalid theme', () => {
      expect(() => UserSettings.create({ userId: USER_ID, theme: 'neon' as never })).toThrow(
        'UserSettings theme must be one of: light, dark, system',
      );
    });

    it('rejects an invalid font size', () => {
      expect(() => UserSettings.create({ userId: USER_ID, fontSize: 'huge' as never })).toThrow(
        'UserSettings fontSize must be one of: sm, base, lg, xl',
      );
    });

    it('rejects an invalid locale', () => {
      expect(() => UserSettings.create({ userId: USER_ID, locale: 'fr' as never })).toThrow(
        'UserSettings locale must be one of: es, en, system',
      );
    });

    it('rejects a non-positive version', () => {
      expect(() => UserSettings.create({ userId: USER_ID, version: 0 })).toThrow(
        'UserSettings version must be a positive integer',
      );
    });

    it('rejects an invalid timestamp', () => {
      expect(() => UserSettings.create({ userId: USER_ID, updatedAt: new Date('nope') })).toThrow(
        'UserSettings timestamp must be a valid Date',
      );
    });
  });

  describe('update', () => {
    it('returns a new instance with an incremented version', () => {
      const original = UserSettings.create({
        userId: USER_ID,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      const updated = original.update({
        theme: 'dark',
        updatedAt: new Date('2024-01-01T00:00:05.000Z'),
      });

      expect(updated).not.toBe(original);
      expect(updated.theme).toBe('dark');
      expect(updated.version).toBe(2);
      expect(original.theme).toBe('system');
      expect(original.version).toBe(1);
      expect(updated.updatedAt.toISOString()).toBe('2024-01-01T00:00:05.000Z');
    });

    it('keeps the original values for fields that are not patched', () => {
      const original = UserSettings.create({
        userId: USER_ID,
        theme: 'dark',
        fontSize: 'lg',
        locale: 'es',
      });
      const updated = original.update({ reducedMotion: true });

      expect(updated.theme).toBe('dark');
      expect(updated.fontSize).toBe('lg');
      expect(updated.locale).toBe('es');
      expect(updated.reducedMotion).toBe(true);
    });

    it('returns the same instance when nothing changes', () => {
      const original = UserSettings.create({ userId: USER_ID, theme: 'dark' });
      const updated = original.update({ theme: 'dark' });

      expect(updated).toBe(original);
    });

    it('rejects invalid values', () => {
      const original = UserSettings.create({ userId: USER_ID });

      expect(() => original.update({ fontSize: 'tiny' as never })).toThrow(
        'UserSettings fontSize must be one of: sm, base, lg, xl',
      );
    });
  });

  describe('fromPersistence', () => {
    it('rebuilds an equivalent instance', () => {
      const props = {
        userId: USER_ID,
        theme: 'dark' as const,
        fontSize: 'lg' as const,
        locale: 'en' as const,
        reducedMotion: true,
        version: 4,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      const settings = UserSettings.fromPersistence(props);

      expect(settings.theme).toBe('dark');
      expect(settings.version).toBe(4);
      expect(settings.updatedAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('rejects an invalid version', () => {
      expect(() =>
        UserSettings.fromPersistence({
          userId: USER_ID,
          theme: 'system',
          fontSize: 'base',
          locale: 'system',
          reducedMotion: false,
          version: 0,
          updatedAt: new Date(),
        }),
      ).toThrow('UserSettings version must be a positive integer');
    });
  });

  describe('equals', () => {
    it('compares every preference and timestamp', () => {
      const timestamp = new Date('2024-01-01T00:00:00.000Z');
      const a = UserSettings.create({ userId: USER_ID, theme: 'dark', updatedAt: timestamp });
      const b = UserSettings.create({ userId: USER_ID, theme: 'dark', updatedAt: timestamp });

      expect(a.equals(b)).toBe(true);
      expect(a.equals(b.update({ theme: 'light' }))).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serializes to a persistence-friendly shape', () => {
      const settings = UserSettings.create({
        userId: USER_ID,
        theme: 'dark',
        fontSize: 'lg',
        locale: 'es',
        reducedMotion: true,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      expect(settings.toJSON()).toEqual({
        userId: 'user-1',
        theme: 'dark',
        fontSize: 'lg',
        locale: 'es',
        reducedMotion: true,
        version: 1,
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });
});
