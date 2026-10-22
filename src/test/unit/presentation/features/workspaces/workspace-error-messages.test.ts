import {
  describeCreateWorkspaceError,
  describeDeleteWorkspaceError,
  describeDuplicateWorkspaceError,
  describeListWorkspacesError,
  describeUpdateWorkspaceError,
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
      'We could not load your boards. Please try again.',
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
      'You do not have permission to create boards.',
    );
  });

  it('maps an existing membership conflict to a membership message', () => {
    const error = createAppError('conflict', ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS, 'raw');

    expect(describeCreateWorkspaceError(error)).toBe('You are already a member of this board.');
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

describe('describeUpdateWorkspaceError', () => {
  it('maps network, persistence and session failures', () => {
    expect(
      describeUpdateWorkspaceError(
        createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw'),
      ),
    ).toBe('We could not reach the server. Check your connection and try again.');
    expect(
      describeUpdateWorkspaceError(
        createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'raw'),
      ),
    ).toBe('The service is temporarily unavailable. Please try again.');
    expect(
      describeUpdateWorkspaceError(
        createAppError('authorization', ERROR_CODES.AUTH_UNAUTHENTICATED, 'raw'),
      ),
    ).toBe('Your session has expired. Sign in again to continue.');
  });

  it('maps forbidden, missing and invalid workspaces to specific messages', () => {
    expect(
      describeUpdateWorkspaceError(
        createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw'),
      ),
    ).toBe('You do not have permission to edit this board.');
    expect(
      describeUpdateWorkspaceError(
        createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'raw'),
      ),
    ).toBe('The board does not exist.');
    expect(
      describeUpdateWorkspaceError(
        createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, 'raw'),
      ),
    ).toBe('Check the board details and try again.');
  });

  it('does not leak the underlying message for unknown errors', () => {
    const error = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'internal-secret');

    expect(describeUpdateWorkspaceError(error)).toBe(
      'We could not update this board. Please try again.',
    );
  });
});

describe('describeDuplicateWorkspaceError', () => {
  it('maps network, persistence and session failures', () => {
    expect(
      describeDuplicateWorkspaceError(
        createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw'),
      ),
    ).toBe('We could not reach the server. Check your connection and try again.');
    expect(
      describeDuplicateWorkspaceError(
        createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'raw'),
      ),
    ).toBe('The service is temporarily unavailable. Please try again.');
    expect(
      describeDuplicateWorkspaceError(
        createAppError('authorization', ERROR_CODES.AUTH_UNAUTHENTICATED, 'raw'),
      ),
    ).toBe('Your session has expired. Sign in again to continue.');
  });

  it('maps forbidden and missing workspaces to specific messages', () => {
    expect(
      describeDuplicateWorkspaceError(
        createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw'),
      ),
    ).toBe('You do not have permission to duplicate this board.');
    expect(
      describeDuplicateWorkspaceError(
        createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'raw'),
      ),
    ).toBe('The board does not exist.');
  });

  it('does not leak the underlying message for unknown errors', () => {
    const error = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'internal-secret');

    expect(describeDuplicateWorkspaceError(error)).toBe(
      'We could not duplicate this board. Please try again.',
    );
  });
});

describe('describeDeleteWorkspaceError', () => {
  it('maps network, persistence and session failures', () => {
    expect(
      describeDeleteWorkspaceError(
        createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'raw'),
      ),
    ).toBe('We could not reach the server. Check your connection and try again.');
    expect(
      describeDeleteWorkspaceError(
        createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'raw'),
      ),
    ).toBe('The service is temporarily unavailable. Please try again.');
    expect(
      describeDeleteWorkspaceError(
        createAppError('authorization', ERROR_CODES.AUTH_UNAUTHENTICATED, 'raw'),
      ),
    ).toBe('Your session has expired. Sign in again to continue.');
  });

  it('maps authorization failures to a delete-specific message', () => {
    const error = createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw');

    expect(describeDeleteWorkspaceError(error)).toBe(
      'You do not have permission to delete this board.',
    );
  });

  it('does not leak the underlying message for unknown errors', () => {
    const error = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'internal-secret');

    expect(describeDeleteWorkspaceError(error)).toBe(
      'We could not delete this board. Please try again.',
    );
  });
});
