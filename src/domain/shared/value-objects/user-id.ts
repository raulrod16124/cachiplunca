export class UserId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): UserId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('UserId cannot be empty');
    }
    return new UserId(trimmed);
  }

  static of(value: string): UserId {
    return UserId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
