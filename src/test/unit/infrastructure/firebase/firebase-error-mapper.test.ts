import { ERROR_CODES, isAppError, type AppError } from '../../../../shared/errors';
import { mapFirebaseError } from '../../../../infrastructure/firebase/firebase-error-mapper';

function firebaseError(code: string, message = `Firebase: Error (${code}).`): Error {
  return Object.assign(new Error(message), { code });
}

describe('mapFirebaseError', () => {
  it('returns an AppError untouched', () => {
    const original: AppError = {
      kind: 'conflict',
      code: ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
      message: 'The email address is already in use.',
    };

    expect(mapFirebaseError(original)).toBe(original);
  });

  it.each([
    ['auth/invalid-email', 'validation', ERROR_CODES.VALIDATION_INVALID_INPUT],
    ['auth/weak-password', 'validation', ERROR_CODES.VALIDATION_INVALID_INPUT],
    ['auth/email-already-in-use', 'conflict', ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE],
    ['auth/invalid-credential', 'authorization', ERROR_CODES.AUTH_INVALID_CREDENTIALS],
    ['auth/wrong-password', 'authorization', ERROR_CODES.AUTH_INVALID_CREDENTIALS],
    ['auth/user-not-found', 'authorization', ERROR_CODES.AUTH_INVALID_CREDENTIALS],
    ['auth/network-request-failed', 'network', ERROR_CODES.NETWORK_REQUEST_FAILED],
    ['permission-denied', 'authorization', ERROR_CODES.AUTH_FORBIDDEN],
    ['not-found', 'notFound', ERROR_CODES.NOT_FOUND_RESOURCE],
    ['unavailable', 'network', ERROR_CODES.NETWORK_REQUEST_FAILED],
    ['deadline-exceeded', 'network', ERROR_CODES.NETWORK_REQUEST_FAILED],
  ])('maps %s to kind %s and code %s', (providerCode, kind, code) => {
    const cause = firebaseError(providerCode);

    const result = mapFirebaseError(cause);

    expect(result.kind).toBe(kind);
    expect(result.code).toBe(code);
    expect(result.cause).toBe(cause);
    expect(isAppError(result)).toBe(true);
  });

  it('never exposes the raw provider message for mapped errors', () => {
    const cause = firebaseError('auth/email-already-in-use');

    const result = mapFirebaseError(cause);

    expect(result.message).not.toContain('Firebase');
    expect(result.message).toBe('The email address is already in use.');
  });

  it('preserves an unknown provider code as an unknown error', () => {
    const cause = firebaseError('auth/unexpected-code');

    const result = mapFirebaseError(cause);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe('auth/unexpected-code');
    expect(result.message).toBe('Unexpected error');
    expect(result.cause).toBe(cause);
  });

  it('wraps values without a code as an unknown error', () => {
    const cause = new Error('boom');

    const result = mapFirebaseError(cause);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    expect(result.message).toBe('Unexpected error');
    expect(result.cause).toBe(cause);
  });

  it.each([
    ['null', null],
    ['a string', 'boom'],
    ['a plain object', { message: 'boom' }],
  ])('wraps %s as an unknown error', (_label, value) => {
    const result = mapFirebaseError(value);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    expect(result.cause).toBe(value);
    expect(isAppError(result)).toBe(true);
  });
});
