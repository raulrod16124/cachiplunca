import { ERROR_CODES, type AppError } from '../../../shared/errors';

export function describeInviteMemberError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to invite members to this workspace.';
    case ERROR_CODES.INVITATION_ALREADY_EXISTS:
      return 'There is already a pending invitation for this email.';
    default:
      return error.message;
  }
}

export function describeAcceptInvitationError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.INVITATION_INVALID:
      return 'This invitation link is invalid or has already been used.';
    case ERROR_CODES.INVITATION_EXPIRED:
      return 'This invitation has expired. Ask the workspace owner for a new one.';
    case ERROR_CODES.INVITATION_EMAIL_MISMATCH:
      return 'This invitation was issued for a different email address. Sign in with the invited email.';
    case ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS:
      return 'You already have access to this workspace.';
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.VALIDATION_INVALID_INPUT:
      return 'This invitation link is not valid.';
    default:
      return error.message;
  }
}

export function describePendingInvitationsError(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'We could not reach the server. Check your connection and try again.';
    case ERROR_CODES.PERSISTENCE_UNAVAILABLE:
    case ERROR_CODES.PERSISTENCE_WRITE_FAILED:
      return 'The service is temporarily unavailable. Please try again.';
    case ERROR_CODES.AUTH_UNAUTHENTICATED:
      return 'Your session has expired. Sign in again to continue.';
    case ERROR_CODES.AUTH_FORBIDDEN:
      return 'You do not have permission to view the invitations of this workspace.';
    default:
      return error.message;
  }
}
