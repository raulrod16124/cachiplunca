import { isValidEmail, PASSWORD_MIN_LENGTH } from '../../../../shared/utils';

describe('isValidEmail', () => {
  it.each([
    'user@example.com',
    'first.last@example.co.uk',
    'user+tag@sub.example.com',
    '  padded@example.com  ',
    'USER@Example.COM',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    '',
    'plain',
    'user@',
    '@example.com',
    'user@example',
    'user @example.com',
    'user@ example.com',
    'user@.com',
  ])('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('PASSWORD_MIN_LENGTH', () => {
  it('matches the minimum accepted by the auth provider', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
  });
});
