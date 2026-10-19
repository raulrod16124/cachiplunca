import type { Presence } from '../../../../domain/collaboration';
import { Presence as PresenceEntity } from '../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import {
  presenceLabel,
  shortUserId,
  userDetailedLabel,
  userLabel,
} from '../../../../presentation/collaboration/presence-label';

const WORKSPACE_ID = WorkspaceId.create('ws-1');

function presenceOf(userId: string, displayName: string | null): Presence {
  return PresenceEntity.create({
    userId: UserId.create(userId),
    workspaceId: WORKSPACE_ID,
    displayName,
  });
}

describe('presence-label', () => {
  it('shortens long user ids to the last eight characters', () => {
    expect(shortUserId('abcdefghijklmnop')).toBe('ijklmnop');
    expect(shortUserId('short')).toBe('short');
  });

  it('prefers the display name over the short id', () => {
    expect(userLabel('Ada Lovelace', 'user-1')).toBe('Ada Lovelace');
  });

  it('falls back to the short user id when there is no label', () => {
    expect(userLabel(null, 'abcdefghijklmnop')).toBe('ijklmnop');
    expect(userLabel('   ', 'user-1')).toBe('user-1');
  });

  it('resolves the label from a presence', () => {
    expect(presenceLabel(presenceOf('user-1', 'Grace Hopper'))).toBe('Grace Hopper');
    expect(presenceLabel(presenceOf('user-1', null))).toBe('user-1');
  });

  it('adds the short id to the detailed label only when it adds information', () => {
    expect(userDetailedLabel('Grace Hopper', 'user-1')).toBe('Grace Hopper (user-1)');
    expect(userDetailedLabel(null, 'user-1')).toBe('user-1');
  });
});
