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
