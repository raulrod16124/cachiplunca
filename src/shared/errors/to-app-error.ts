import { createAppError, ERROR_CODES, isAppError, type AppError } from './app-error';

export function toAppError(value: unknown): AppError {
  if (isAppError(value)) {
    return value;
  }

  if (value instanceof Error) {
    const code = readErrorCode(value);
    return createAppError(
      'unknown',
      code ?? ERROR_CODES.UNKNOWN_UNEXPECTED,
      value.message.length > 0 ? value.message : 'Unexpected error',
      { cause: value },
    );
  }

  return createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'Unexpected error', {
    cause: value,
  });
}

function readErrorCode(error: Error): string | undefined {
  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}
