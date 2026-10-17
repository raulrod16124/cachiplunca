import { UserSettings } from '../../../../domain/user-settings';
import { UserId } from '../../../../domain/shared';
import {
  fromUserSettingsDocument,
  toUserSettingsDocument,
} from '../../../../infrastructure/firebase/firebase-user-settings-mapper';

const USER_ID = UserId.create('user-1');
const UPDATED_AT = new Date('2024-01-02T00:00:00.000Z');

function buildSettings(): UserSettings {
  return UserSettings.create({
    userId: USER_ID,
    theme: 'dark',
    fontSize: 'lg',
    locale: 'es',
    reducedMotion: true,
    version: 2,
    updatedAt: UPDATED_AT,
  });
}

describe('toUserSettingsDocument', () => {
  it('maps a UserSettings to a plain document', () => {
    const document = toUserSettingsDocument(buildSettings());

    expect(document).toEqual({
      userId: 'user-1',
      theme: 'dark',
      fontSize: 'lg',
      locale: 'es',
      reducedMotion: true,
      version: 2,
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('round-trips through fromUserSettingsDocument', () => {
    const settings = buildSettings();
    const restored = fromUserSettingsDocument(toUserSettingsDocument(settings));

    expect(restored?.equals(settings)).toBe(true);
  });
});

describe('fromUserSettingsDocument', () => {
  it('returns null for non-object input', () => {
    expect(fromUserSettingsDocument(null)).toBeNull();
    expect(fromUserSettingsDocument('nope')).toBeNull();
    expect(fromUserSettingsDocument(42)).toBeNull();
  });

  it('returns null when the userId is missing or empty', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), userId: '' })).toBeNull();
    expect(fromUserSettingsDocument({ ...baseDocument(), userId: 3 })).toBeNull();
  });

  it('returns null for an unknown theme', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), theme: 'neon' })).toBeNull();
  });

  it('returns null for an unknown font size', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), fontSize: 'huge' })).toBeNull();
  });

  it('returns null for an unknown locale', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), locale: 'fr' })).toBeNull();
  });

  it('returns null when reducedMotion is not a boolean', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), reducedMotion: 'yes' })).toBeNull();
  });

  it('returns null for an invalid version', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), version: 0 })).toBeNull();
    expect(fromUserSettingsDocument({ ...baseDocument(), version: 1.5 })).toBeNull();
  });

  it('returns null for an unparseable timestamp', () => {
    expect(fromUserSettingsDocument({ ...baseDocument(), updatedAt: 'not-a-date' })).toBeNull();
    expect(fromUserSettingsDocument({ ...baseDocument(), updatedAt: 123 })).toBeNull();
  });
});

function baseDocument(): Record<string, unknown> {
  return {
    userId: 'user-1',
    theme: 'system',
    fontSize: 'base',
    locale: 'system',
    reducedMotion: false,
    version: 1,
    updatedAt: '2024-01-02T00:00:00.000Z',
  };
}
