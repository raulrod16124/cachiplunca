export interface UserDisplayNameSource {
  readonly displayName?: string | null;
  readonly email?: string | null;
}

/**
 * Resolves the human-friendly label used to identify a user in a workspace.
 *
 * Priority: saved display name (trimmed) → email local part (before `@`) →
 * `null` (the UI falls back to the short user id). Returns `null` for blank
 * or malformed values so persistence never stores empty labels.
 */
export function resolveUserDisplayName(source: UserDisplayNameSource): string | null {
  const name = normalize(source.displayName);

  if (name !== null) {
    return name;
  }

  const email = normalize(source.email);

  if (email === null) {
    return null;
  }

  const atIndex = email.indexOf('@');

  if (atIndex <= 0) {
    return null;
  }

  return normalize(email.slice(0, atIndex));
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
