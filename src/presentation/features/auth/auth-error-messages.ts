import { ERROR_CODES, type AppError } from '../../../shared/errors';

const NETWORK_FAILURE_MESSAGE =
  'We could not reach the server. Check your connection and try again.';

const SERVICE_UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again.';

function describeTransportError(error: AppError): string | null {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return NETWORK_FAILURE_MESSAGE;
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
      return SERVICE_UNAVAILABLE_MESSAGE;
    default:
      return null;
  }
}

export function describeRegisterError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE:
      return 'An account with this email already exists. Try signing in instead.';
    default:
      return describeTransportError(error) ?? error.message;
  }
}

export function describeLoginError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.AUTH_INVALID_CREDENTIALS:
      return 'Email or password is incorrect.';
    default:
      return describeTransportError(error) ?? error.message;
  }
}
