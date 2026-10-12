export class ElementId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): ElementId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('ElementId cannot be empty');
    }
    return new ElementId(trimmed);
  }

  static of(value: string): ElementId {
    return ElementId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ElementId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
