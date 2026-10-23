import { GRANTABLE_ROLES } from '../../../../../../domain/membership';
import {
  defaultInviteRole,
  INVITE_ROLE_OPTIONS,
  inviteRoleOptionsFor,
} from '../../../../../../presentation/features/invitations/components/invite-role-options';

describe('invite role options', () => {
  it('lists owner, editor and viewer with translated name and description keys', () => {
    expect(INVITE_ROLE_OPTIONS.map((option) => option.value)).toEqual([
      'owner',
      'editor',
      'viewer',
    ]);
    expect(INVITE_ROLE_OPTIONS.every((option) => option.descriptionKey.length > 0)).toBe(true);
  });

  it('filters the options by the roles the actor can grant', () => {
    expect(inviteRoleOptionsFor(GRANTABLE_ROLES.owner).map((option) => option.value)).toEqual([
      'owner',
      'editor',
      'viewer',
    ]);
    expect(inviteRoleOptionsFor(GRANTABLE_ROLES.editor).map((option) => option.value)).toEqual([
      'editor',
      'viewer',
    ]);
    expect(inviteRoleOptionsFor(GRANTABLE_ROLES.viewer)).toEqual([]);
  });

  it('defaults to editor when it is available', () => {
    expect(defaultInviteRole(['owner', 'editor', 'viewer'])).toBe('editor');
  });

  it('falls back to the first available role when editor is not grantable', () => {
    expect(defaultInviteRole(['owner', 'viewer'])).toBe('owner');
    expect(defaultInviteRole(['viewer'])).toBe('viewer');
  });
});
