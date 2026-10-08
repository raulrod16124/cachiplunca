import { describeRegisterError } from '../../../../../presentation/features/auth/auth-error-messages';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('describeRegisterError', () => {
  it('explains an already registered email', () => {
    const error = createAppError(
      'conflict',
      ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
      'The email address is already in use.',
    );
    expect(describeRegisterError(error)).toBe(
      'An account with this email already exists. Try signing in instead.',
    );
  });

  it('explains a network failure', () => {
    const error = createAppError(
      'network',
      ERROR_CODES.NETWORK_REQUEST_FAILED,
      'Network request failed.',
    );
    expect(describeRegisterError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('explains unavailable persistence', () => {
    const error = createAppError(
      'persistence',
      ERROR_CODES.PERSISTENCE_UNAVAILABLE,
      'Service unavailable.',
    );
    expect(describeRegisterError(error)).toBe(
      'The service is temporarily unavailable. Please try again.',
    );
  });

  it('falls back to the sanitized AppError message for unmapped codes', () => {
    const error = createAppError('unknown', 'custom/provider-issue', 'Provider issue.');
    expect(describeRegisterError(error)).toBe('Provider issue.');
  });
});
