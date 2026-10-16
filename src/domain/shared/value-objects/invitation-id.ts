export class InvitationId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): InvitationId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('InvitationId cannot be empty');
    }
    return new InvitationId(trimmed);
  }

  static of(value: string): InvitationId {
    return InvitationId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: InvitationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
