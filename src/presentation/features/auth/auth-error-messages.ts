import { ERROR_CODES, type AppError } from '../../../shared/errors';

export function describeRegisterError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE:
      return 'An account with this email already exists. Try signing in instead.';
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
      return 'The service is temporarily unavailable. Please try again.';
    default:
      return error.message;
  }
}
