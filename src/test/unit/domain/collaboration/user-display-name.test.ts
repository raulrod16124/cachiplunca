import { resolveUserDisplayName } from '../../../../domain/collaboration';

describe('resolveUserDisplayName', () => {
  it('prefers the saved display name and trims it', () => {
    expect(
      resolveUserDisplayName({ displayName: '  Ada Lovelace ', email: 'ada@example.com' }),
    ).toBe('Ada Lovelace');
  });

  it('falls back to the email local part when there is no saved name', () => {
    expect(resolveUserDisplayName({ displayName: null, email: 'ada.lovelace@example.com' })).toBe(
      'ada.lovelace',
    );
  });

  it('treats a blank display name as missing', () => {
    expect(resolveUserDisplayName({ displayName: '   ', email: 'grace@example.com' })).toBe(
      'grace',
    );
  });

  it('returns null when there is no usable name or email', () => {
    expect(resolveUserDisplayName({ displayName: null, email: null })).toBeNull();
    expect(resolveUserDisplayName({ displayName: '  ', email: '   ' })).toBeNull();
  });

  it('returns null for malformed emails without a local part', () => {
    expect(resolveUserDisplayName({ displayName: null, email: 'example.com' })).toBeNull();
    expect(resolveUserDisplayName({ displayName: null, email: '@example.com' })).toBeNull();
    expect(resolveUserDisplayName({ displayName: null, email: '   @example.com' })).toBeNull();
  });
});
