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

export function describeListMembersError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to view the members of this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'This board does not exist or you no longer have access to it.';
    default:
      return error.message;
  }
}

export function describeChangeMemberRoleError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to change member roles in this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'That person is no longer a member of this board.';
    case ERROR_CODES.VALIDATION_INVALID_INPUT:
      return 'Choose a valid role.';
    default:
      return error.message;
  }
}

export function describeRemoveMemberError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to remove members from this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'That person is no longer a member of this board.';
    default:
      return error.message;
  }
}

export function describeLeaveWorkspaceError(error: AppError): string {
  const common = describeCommonError(error);
  if (common !== null) {
    return common;
  }

  switch (error.code) {
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to leave this board.';
    case ERROR_CODES.NOT_FOUND_RESOURCE:
      return 'You are no longer a member of this board.';
    default:
      return error.message;
  }
}
