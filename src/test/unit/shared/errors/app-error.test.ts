import {
  APP_ERROR_KINDS,
  createAppError,
  ERROR_CODES,
  isAppError,
} from '../../../../shared/errors';

describe('createAppError', () => {
  it('creates an error with the given kind, code and message', () => {
    const error = createAppError('validation', 'validation/invalid-input', 'Invalid input');

    expect(error.kind).toBe('validation');
    expect(error.code).toBe('validation/invalid-input');
    expect(error.message).toBe('Invalid input');
  });

  it('preserves details and cause when provided', () => {
    const cause = new Error('root cause');
    const error = createAppError('persistence', 'persistence/write-failed', 'Write failed', {
      details: { collection: 'workspaces' },
      cause,
    });

    expect(error.details).toEqual({ collection: 'workspaces' });
    expect(error.cause).toBe(cause);
  });

  it('omits details and cause when not provided', () => {
    const error = createAppError('network', 'network/request-failed', 'Network failed');

    expect('details' in error).toBe(false);
    expect('cause' in error).toBe(false);
  });

  it('creates an error for every supported kind', () => {
    for (const kind of APP_ERROR_KINDS) {
      const error = createAppError(kind, 'test/code', 'message');
      expect(error.kind).toBe(kind);
      expect(isAppError(error)).toBe(true);
    }
  });
});

describe('ERROR_CODES', () => {
  it('contains no duplicate values', () => {
    const values = Object.values(ERROR_CODES);

    expect(new Set(values).size).toBe(values.length);
  });
});

describe('isAppError', () => {
  it('returns true for a valid AppError', () => {
    expect(isAppError(createAppError('unknown', 'unknown/unexpected', 'message'))).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'validation/invalid-input'],
    ['an Error instance', new Error('boom')],
    ['an object without kind', { code: 'validation/invalid-input', message: 'msg' }],
    ['an object with an invalid kind', { kind: 'other', code: 'c', message: 'm' }],
    ['an object with a non-string code', { kind: 'validation', code: 1, message: 'm' }],
    ['an object with a non-string message', { kind: 'validation', code: 'c', message: 2 }],
  ])('returns false for %s', (_label, value) => {
    expect(isAppError(value)).toBe(false);
  });
});
