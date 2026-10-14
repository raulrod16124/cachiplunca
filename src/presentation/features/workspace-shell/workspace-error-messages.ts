import { ERROR_CODES, type AppError } from '../../../shared/errors';

export function describeGetWorkspaceError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to view this workspace.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'The workspace does not exist.';
    default:
      return error.message;
  }
}

export function describeLoadWorkspaceElementsError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to view this board.';
    default:
      return error.message;
  }
}

export function describeCollaborationSyncError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'Live collaboration is offline. Changes from other people may not appear.';
    case ERROR_CODES.COLLABORATION_SYNC_FAILED:
      return 'We could not keep the board in sync. Reconnecting automatically.';
    default:
      return error.message;
  }
}

export function describePersistElementsError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not save your changes. Check your connection.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'We could not save your latest changes. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to keep editing.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to edit this board.';
    default:
      return 'We could not save your latest changes.';
  }
}

export function describeCreateElementError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.VALIDATION_INVALID_INPUT:
      return 'We could not add that element. Check the details and try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to keep editing.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to edit this board.';
    default:
      return 'We could not add that element. Please try again.';
  }
}
