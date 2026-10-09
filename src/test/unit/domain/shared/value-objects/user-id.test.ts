import { UserId } from '../../../../../domain/shared';

describe('UserId', () => {
  it('creates a valid user id', () => {
    const id = UserId.create('user-123');

    expect(id.value).toBe('user-123');
  });

  it('trims whitespace', () => {
    const id = UserId.create('  user-123  ');

    expect(id.value).toBe('user-123');
  });

  it('throws when empty', () => {
    expect(() => UserId.create('')).toThrow('UserId cannot be empty');
  });

  it('throws when whitespace only', () => {
    expect(() => UserId.create('   ')).toThrow('UserId cannot be empty');
  });

  it('compares equality correctly', () => {
    const id1 = UserId.create('user-123');
    const id2 = UserId.create('user-123');
    const id3 = UserId.create('user-456');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  it('converts to string', () => {
    const id = UserId.create('user-123');

    expect(id.toString()).toBe('user-123');
  });

  it('creates from of method', () => {
    const id = UserId.of('user-123');

    expect(id.value).toBe('user-123');
  });
});
