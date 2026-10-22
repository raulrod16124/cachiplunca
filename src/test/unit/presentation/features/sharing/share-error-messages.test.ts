import {
  describeChangeMemberRoleError,
  describeLeaveWorkspaceError,
  describeListMembersError,
  describeRemoveMemberError,
} from '../../../../../presentation/features/sharing/share-error-messages';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('describeListMembersError', () => {
  it('maps network failures to a connection message', () => {
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw');

    expect(describeListMembersError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('maps forbidden to a permission message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeListMembersError(error)).toBe(
      'You do not have permission to view the members of this board.',
    );
  });

  it('falls back to the error message for unmapped codes', () => {
    const error = createAppError(
      'unknown',
      ERROR_CODES.UNKNOWN_UNEXPECTED,
      'Something else broke.',
    );

    expect(describeListMembersError(error)).toBe('Something else broke.');
  });
});

describe('describeChangeMemberRoleError', () => {
  it('maps forbidden to a permission message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeChangeMemberRoleError(error)).toBe(
      'You do not have permission to change member roles in this board.',
    );
  });

  it('maps a missing target membership', () => {
    const error = createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'raw');

    expect(describeChangeMemberRoleError(error)).toBe(
      'That person is no longer a member of this board.',
    );
  });

  it('maps invalid input to a role message', () => {
    const error = createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, 'raw');

    expect(describeChangeMemberRoleError(error)).toBe('Choose a valid role.');
  });
});

describe('describeRemoveMemberError', () => {
  it('maps forbidden to a permission message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeRemoveMemberError(error)).toBe(
      'You do not have permission to remove members from this board.',
    );
  });

  it('maps persistence failures to a service message', () => {
    const error = createAppError('persistence', ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'raw');

    expect(describeRemoveMemberError(error)).toBe(
      'The service is temporarily unavailable. Please try again.',
    );
  });
});

describe('describeLeaveWorkspaceError', () => {
  it('maps forbidden to a permission message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeLeaveWorkspaceError(error)).toBe(
      'You do not have permission to leave this board.',
    );
  });

  it('maps an unauthenticated session', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_UNAUTHENTICATED, 'raw');

    expect(describeLeaveWorkspaceError(error)).toBe(
      'Your session has expired. Sign in again to continue.',
    );
  });
});
