import type { Presence } from '../../domain/collaboration';

export const SHORT_USER_ID_LENGTH = 8;

/**
 * Short, stable reference used when a user has neither a display name nor an
 * email-derived label. Also serves as the disambiguating id in the presence UI.
 */
export function shortUserId(userId: string): string {
  return userId.length <= SHORT_USER_ID_LENGTH ? userId : userId.slice(-SHORT_USER_ID_LENGTH);
}

/**
 * Human-friendly label for a participant: saved display name → email local
 * part (already resolved into `displayName`) → short user id.
 */
export function userLabel(displayName: string | null | undefined, userId: string): string {
  const name = displayName?.trim();

  return name === undefined || name === '' ? shortUserId(userId) : name;
}

export function presenceLabel(presence: Presence): string {
  return userLabel(presence.displayName, presence.userId.value);
}

/**
 * Label plus the short user id, only when the id adds information (duplicate
 * names, fallback labels). Used for tooltips and the participant list.
 */
export function userDetailedLabel(displayName: string | null | undefined, userId: string): string {
  const label = userLabel(displayName, userId);
  const shortId = shortUserId(userId);

  return label === shortId ? label : `${label} (${shortId})`;
}
