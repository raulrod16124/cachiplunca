export class NotificationId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): NotificationId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('NotificationId cannot be empty');
    }
    return new NotificationId(trimmed);
  }

  static of(value: string): NotificationId {
    return NotificationId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: NotificationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
