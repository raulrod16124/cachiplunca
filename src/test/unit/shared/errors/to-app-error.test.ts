import { createAppError, ERROR_CODES, toAppError } from '../../../../shared/errors';

describe('toAppError', () => {
  it('returns the same AppError instance untouched', () => {
    const original = createAppError('validation', 'validation/invalid-input', 'Invalid input');

    expect(toAppError(original)).toBe(original);
  });

  it('wraps an Error with a code as an unknown error preserving code and message', () => {
    const cause = Object.assign(new Error('boom'), { code: 'custom/provider-code' });

    const result = toAppError(cause);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe('custom/provider-code');
    expect(result.message).toBe('boom');
    expect(result.cause).toBe(cause);
  });

  it('wraps an Error without a code using the unknown fallback code', () => {
    const cause = new Error('boom');

    const result = toAppError(cause);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    expect(result.message).toBe('boom');
    expect(result.cause).toBe(cause);
  });

  it('uses a generic message when the Error message is empty', () => {
    const result = toAppError(new Error(''));

    expect(result.message).toBe('Unexpected error');
  });

  it.each([
    ['a string', 'boom'],
    ['a number', 42],
    ['a plain object', { unexpected: true }],
    ['undefined', undefined],
  ])('wraps %s as an unknown error keeping the original as cause', (_label, value) => {
    const result = toAppError(value);

    expect(result.kind).toBe('unknown');
    expect(result.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    expect(result.message).toBe('Unexpected error');
    expect(result.cause).toBe(value);
  });
});
