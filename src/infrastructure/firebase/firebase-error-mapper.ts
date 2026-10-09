import {
  createAppError,
  isAppError,
  ERROR_CODES,
  type AppError,
  type AppErrorKind,
} from '../../shared/errors';

interface MappedError {
  readonly kind: AppErrorKind;
  readonly code: string;
  readonly message: string;
}

const FIREBASE_ERROR_MAP: Readonly<Record<string, MappedError>> = {
  'auth/invalid-email': {
    kind: 'validation',
    code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    message: 'The email address is not valid.',
  },
  'auth/weak-password': {
    kind: 'validation',
    code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    message: 'The password does not meet the requirements.',
  },
  'auth/email-already-in-use': {
    kind: 'conflict',
    code: ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
    message: 'The email address is already in use.',
  },
  'auth/invalid-credential': {
    kind: 'authorization',
    code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    message: 'The credentials are not valid.',
  },
  'auth/wrong-password': {
    kind: 'authorization',
    code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    message: 'The credentials are not valid.',
  },
  'auth/user-not-found': {
    kind: 'authorization',
    code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    message: 'The credentials are not valid.',
  },
  'auth/network-request-failed': {
    kind: 'network',
    code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    message: 'The network request failed.',
  },
  'permission-denied': {
    kind: 'authorization',
    code: ERROR_CODES.AUTH_FORBIDDEN,
    message: 'You do not have permission to perform this action.',
  },
  'not-found': {
    kind: 'notFound',
    code: ERROR_CODES.NOT_FOUND_RESOURCE,
    message: 'The requested resource was not found.',
  },
  unavailable: {
    kind: 'network',
    code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    message: 'The service is temporarily unavailable.',
  },
  'deadline-exceeded': {
    kind: 'network',
    code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    message: 'The request timed out.',
  },
  unauthenticated: {
    kind: 'authorization',
    code: ERROR_CODES.AUTH_UNAUTHENTICATED,
    message: 'You must be signed in to perform this action.',
  },
  'invalid-argument': {
    kind: 'validation',
    code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    message: 'The request data is not valid.',
  },
  'resource-exhausted': {
    kind: 'persistence',
    code: ERROR_CODES.PERSISTENCE_UNAVAILABLE,
    message: 'The service is temporarily out of capacity.',
  },
  'failed-precondition': {
    kind: 'persistence',
    code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
    message: 'The operation is not valid in the current state.',
  },
  aborted: {
    kind: 'persistence',
    code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
    message: 'The operation was aborted and can be retried.',
  },
  cancelled: {
    kind: 'network',
    code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    message: 'The request was cancelled.',
  },
};

export function mapFirebaseError(value: unknown): AppError {
  if (isAppError(value)) {
    return value;
  }

  const providerCode = readErrorCode(value);

  if (providerCode === undefined) {
    return createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'Unexpected error', {
      cause: value,
    });
  }

  const mapped = FIREBASE_ERROR_MAP[providerCode];

  if (mapped === undefined) {
    return createAppError('unknown', providerCode, 'Unexpected error', { cause: value });
  }

  return createAppError(mapped.kind, mapped.code, mapped.message, { cause: value });
}

function readErrorCode(value: unknown): string | undefined {
  if (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string'
  ) {
    return value.code;
  }
  return undefined;
}
