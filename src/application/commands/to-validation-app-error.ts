import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';

export function toValidationAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}
