import {
  describeCreateWorkspaceError,
  describeListWorkspacesError,
} from '../../../../../presentation/features/workspaces/workspace-error-messages';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('describeListWorkspacesError', () => {
  it('maps network failures to a connection message', () => {
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw');

    expect(describeListWorkspacesError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('maps service failures to a temporally unavailable message', () => {
    const error = createAppError('persistence', ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'raw');

    expect(describeListWorkspacesError(error)).toBe(
      'The service is temporarily unavailable. Please try again.',
    );
  });

  it('maps expired sessions to a sign-in message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_UNAUTHENTICATED, 'raw');

    expect(describeListWorkspacesError(error)).toBe(
      'Your session has expired. Sign in again to continue.',
    );
  });

  it('does not leak the underlying message for unknown errors', () => {
    const error = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'internal-secret');

    expect(describeListWorkspacesError(error)).toBe(
      'We could not load your workspaces. Please try again.',
    );
  });
});

describe('describeCreateWorkspaceError', () => {
  it('maps network failures to a connection message', () => {
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw');

    expect(describeCreateWorkspaceError(error)).toBe(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('maps persistence failures to a service message', () => {
    const unavailable = createAppError('persistence', ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'raw');
    const writeFailed = createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'raw');
    const expected = 'The service is temporarily unavailable. Please try again.';

    expect(describeCreateWorkspaceError(unavailable)).toBe(expected);
    expect(describeCreateWorkspaceError(writeFailed)).toBe(expected);
  });

  it('maps authentication and authorization failures', () => {
    const unauthenticated = createAppError(
      'authorization',
      ERROR_CODES.AUTH_UNAUTHENTICATED,
      'raw',
    );
    const forbidden = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeCreateWorkspaceError(unauthenticated)).toBe(
      'Your session has expired. Sign in again to continue.',
    );
    expect(describeCreateWorkspaceError(forbidden)).toBe(
      'You do not have permission to create workspaces.',
    );
  });

  it('maps an existing membership conflict to a membership message', () => {
    const error = createAppError('conflict', ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS, 'raw');

    expect(describeCreateWorkspaceError(error)).toBe('You are already a member of this workspace.');
  });

  it('falls back to the error message for unmapped codes', () => {
    const error = createAppError(
      'unknown',
      ERROR_CODES.UNKNOWN_UNEXPECTED,
      'Something else broke.',
    );

    expect(describeCreateWorkspaceError(error)).toBe('Something else broke.');
  });
});
