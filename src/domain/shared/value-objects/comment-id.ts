export class CommentId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): CommentId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('CommentId cannot be empty');
    }
    return new CommentId(trimmed);
  }

  static of(value: string): CommentId {
    return CommentId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: CommentId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
