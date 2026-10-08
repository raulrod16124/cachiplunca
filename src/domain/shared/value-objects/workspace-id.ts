export class WorkspaceId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): WorkspaceId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('WorkspaceId cannot be empty');
    }
    return new WorkspaceId(trimmed);
  }

  static of(value: string): WorkspaceId {
    return WorkspaceId.create(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: WorkspaceId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
