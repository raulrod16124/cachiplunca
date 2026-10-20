import { describeCommentError } from '../../../../../presentation/features/workspace-shell/comments-error-messages';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('describeCommentError', () => {
  it('maps authorization errors to a forbidden message', () => {
    expect(
      describeCommentError(
        'load',
        createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'Denied'),
      ),
    ).toBe('comments.error.forbidden');
  });

  it('maps missing comments to a not found message', () => {
    expect(
      describeCommentError(
        'resolve',
        createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'Missing'),
      ),
    ).toBe('comments.error.notFound');
  });

  it('falls back to the action specific message', () => {
    const generic = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'Oops');

    expect(describeCommentError('load', generic)).toBe('comments.error.description');
    expect(describeCommentError('create', generic)).toBe('comments.error.create');
    expect(describeCommentError('resolve', generic)).toBe('comments.error.resolve');
  });
});
