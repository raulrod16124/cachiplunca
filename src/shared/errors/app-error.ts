export const APP_ERROR_KINDS = [
  'validation',
  'authorization',
  'notFound',
  'conflict',
  'persistence',
  'network',
  'collaboration',
  'unknown',
] as const;

export type AppErrorKind = (typeof APP_ERROR_KINDS)[number];

export const ERROR_CODES = {
  VALIDATION_INVALID_INPUT: 'validation/invalid-input',
  AUTH_UNAUTHENTICATED: 'auth/unauthenticated',
  AUTH_FORBIDDEN: 'auth/forbidden',
  AUTH_EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  NOT_FOUND_RESOURCE: 'not-found/resource',
  NETWORK_REQUEST_FAILED: 'network/request-failed',
  PERSISTENCE_UNAVAILABLE: 'persistence/unavailable',
  PERSISTENCE_WRITE_FAILED: 'persistence/write-failed',
  COLLABORATION_SYNC_FAILED: 'collaboration/sync-failed',
  UNKNOWN_UNEXPECTED: 'unknown/unexpected',
} as const;

export type AppErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface AppErrorOptions {
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

interface BaseAppError extends AppErrorOptions {
  readonly code: string;
  readonly message: string;
}

export interface ValidationError extends BaseAppError {
  readonly kind: 'validation';
}

export interface AuthorizationError extends BaseAppError {
  readonly kind: 'authorization';
}

export interface NotFoundError extends BaseAppError {
  readonly kind: 'notFound';
}

export interface ConflictError extends BaseAppError {
  readonly kind: 'conflict';
}

export interface PersistenceError extends BaseAppError {
  readonly kind: 'persistence';
}

export interface NetworkError extends BaseAppError {
  readonly kind: 'network';
}

export interface CollaborationError extends BaseAppError {
  readonly kind: 'collaboration';
}

export interface UnknownError extends BaseAppError {
  readonly kind: 'unknown';
}

export type AppError =
  | ValidationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | PersistenceError
  | NetworkError
  | CollaborationError
  | UnknownError;

export function createAppError(
  kind: AppErrorKind,
  code: string,
  message: string,
  options: AppErrorOptions = {},
): AppError {
  const base = { code, message, ...options };

  switch (kind) {
    case 'validation':
      return { kind, ...base };
    case 'authorization':
      return { kind, ...base };
    case 'notFound':
      return { kind, ...base };
    case 'conflict':
      return { kind, ...base };
    case 'persistence':
      return { kind, ...base };
    case 'network':
      return { kind, ...base };
    case 'collaboration':
      return { kind, ...base };
    case 'unknown':
      return { kind, ...base };
  }
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }
  const candidate = value as { kind?: unknown; code?: unknown; message?: unknown };
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    APP_ERROR_KINDS.some((kind) => kind === candidate.kind)
  );
}
