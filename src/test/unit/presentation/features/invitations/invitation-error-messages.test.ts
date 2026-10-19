import {
  describeAcceptInvitationError,
  describeInviteMemberError,
  describePendingInvitationsError,
} from '../../../../../presentation/features/invitations/invitation-error-messages';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('describeAcceptInvitationError', () => {
  it('maps an invalid invitation', () => {
    const error = createAppError('notFound', ERROR_CODES.INVITATION_INVALID, 'raw');

    expect(describeAcceptInvitationError(error)).toBe(
      'This invitation link is invalid or has already been used.',
    );
  });

  it('maps an expired invitation', () => {
    const error = createAppError('validation', ERROR_CODES.INVITATION_EXPIRED, 'raw');

    expect(describeAcceptInvitationError(error)).toBe(
      'This invitation has expired. Ask the workspace owner for a new one.',
    );
  });

  it('maps an email mismatch', () => {
    const error = createAppError('authorization', ERROR_CODES.INVITATION_EMAIL_MISMATCH, 'raw');

    expect(describeAcceptInvitationError(error)).toBe(
      'This invitation was issued for a different email address. Sign in with the invited email.',
    );
  });

  it('maps an authorization failure while granting access', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeAcceptInvitationError(error)).toBe(
      'We could not add you to this workspace. Please try again or ask for a new invitation.',
    );
  });

  it('maps an existing membership', () => {
    const error = createAppError('conflict', ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS, 'raw');

    expect(describeAcceptInvitationError(error)).toBe('You already have access to this workspace.');
  });

  it('falls back to the error message for unmapped codes', () => {
    const error = createAppError(
      'unknown',
      ERROR_CODES.UNKNOWN_UNEXPECTED,
      'Something else broke.',
    );

    expect(describeAcceptInvitationError(error)).toBe('Something else broke.');
  });
});

describe('describeInviteMemberError', () => {
  it('maps network failures to a connection message', () => {
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw');

    expect(describeInviteMemberError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('maps persistence failures to a service message', () => {
    const unavailable = createAppError('persistence', ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'raw');

    expect(describeInviteMemberError(unavailable)).toBe(
      'The service is temporarily unavailable. Please try again.',
    );
  });

  it('maps authentication and authorization failures', () => {
    const unauthenticated = createAppError(
      'authorization',
      ERROR_CODES.AUTH_UNAUTHENTICATED,
      'raw',
    );
    const forbidden = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeInviteMemberError(unauthenticated)).toBe(
      'Your session has expired. Sign in again to continue.',
    );
    expect(describeInviteMemberError(forbidden)).toBe(
      'You do not have permission to invite members to this workspace.',
    );
  });

  it('maps a pending invitation conflict to a duplicate message', () => {
    const error = createAppError('conflict', ERROR_CODES.INVITATION_ALREADY_EXISTS, 'raw');

    expect(describeInviteMemberError(error)).toBe(
      'There is already a pending invitation for this email.',
    );
  });

  it('falls back to the error message for unmapped codes', () => {
    const error = createAppError(
      'unknown',
      ERROR_CODES.UNKNOWN_UNEXPECTED,
      'Something else broke.',
    );

    expect(describeInviteMemberError(error)).toBe('Something else broke.');
  });
});

describe('describePendingInvitationsError', () => {
  it('maps network failures to a connection message', () => {
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw');

    expect(describePendingInvitationsError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('maps authorization failures to a permission message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describePendingInvitationsError(error)).toBe(
      'You do not have permission to view the invitations of this workspace.',
    );
  });

  it('falls back to the error message for unmapped codes', () => {
    const error = createAppError(
      'unknown',
      ERROR_CODES.UNKNOWN_UNEXPECTED,
      'Something else broke.',
    );

    expect(describePendingInvitationsError(error)).toBe('Something else broke.');
  });
});
