import type { MembershipRole } from '../../../../domain/membership';
import type { TranslationKey } from '../../../i18n';

export interface InviteRoleOption {
  readonly value: MembershipRole;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}

export const INVITE_ROLE_OPTIONS: readonly InviteRoleOption[] = [
  {
    value: 'owner',
    labelKey: 'share.role.owner',
    descriptionKey: 'share.role.owner.description',
  },
  {
    value: 'editor',
    labelKey: 'share.role.editor',
    descriptionKey: 'share.role.editor.description',
  },
  {
    value: 'viewer',
    labelKey: 'share.role.viewer',
    descriptionKey: 'share.role.viewer.description',
  },
];

export function inviteRoleOptionsFor(
  availableRoles: readonly MembershipRole[],
): readonly InviteRoleOption[] {
  return INVITE_ROLE_OPTIONS.filter((option) => availableRoles.includes(option.value));
}

export function defaultInviteRole(availableRoles: readonly MembershipRole[]): MembershipRole {
  return availableRoles.includes('editor') ? 'editor' : (availableRoles[0] ?? 'viewer');
}
