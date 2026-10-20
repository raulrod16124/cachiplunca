import { ERROR_CODES, type AppError } from '../../../shared/errors';

function describeCommonError(error: AppError): string | null {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    default:
      return null;
  }
}

export function describeCreateGuestLinkError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'Only the workspace owner can create a view link.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'This workspace no longer exists.';
    default:
      return error.message;
  }
}

export function describeRevokeGuestLinkError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'Only the workspace owner can revoke the view link.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'This view link no longer exists.';
    default:
      return error.message;
  }
}

export function describeListGuestLinksError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'Only the workspace owner can manage the view link.';
    default:
      return error.message;
  }
}

export function describeOpenGuestWorkspaceError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'This view link is no longer available. Ask the owner for a new one.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'This workspace no longer exists.';
    default:
      return error.message;
  }
}
