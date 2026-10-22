import { ERROR_CODES, type AppError } from '../../../shared/errors';

export function describeListWorkspacesError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    default:
      return 'We could not load your boards. Please try again.';
  }
}

export function describeCreateWorkspaceError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to create boards.';
    case ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS:
      return 'You are already a member of this board.';
    default:
      return error.message;
  }
}

export function describeUpdateWorkspaceError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to edit this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'The board does not exist.';
    case ERROR_CODES.VALIDATION_INVALID_INPUT:
      return 'Check the board details and try again.';
    default:
      return 'We could not update this board. Please try again.';
  }
}

export function describeDuplicateWorkspaceError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to duplicate this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'The board does not exist.';
    default:
      return 'We could not duplicate this board. Please try again.';
  }
}

export function describeDeleteWorkspaceError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to delete this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'The board does not exist.';
    default:
      return 'We could not delete this board. Please try again.';
  }
}
