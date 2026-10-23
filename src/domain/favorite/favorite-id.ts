export class FavoriteId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): FavoriteId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('FavoriteId cannot be empty');
    }
    return new FavoriteId(trimmed);
  }

  static of(value: string): FavoriteId {
    return FavoriteId.create(value);
  }

  static forUserAndWorkspace(userId: string, workspaceId: string): FavoriteId {
    return FavoriteId.create(`${userId}_${workspaceId}`);
  }

  get value(): string {
    return this._value;
  }

  equals(other: FavoriteId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
