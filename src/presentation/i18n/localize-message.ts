import type { I18nContextValue } from './i18n-provider';
import type { TranslationKey } from './messages';

const MESSAGE_KEYS: Readonly<Record<string, TranslationKey>> = {
  'We could not reach the server. Check your connection and try again.': 'errors.network',
  'The service is temporarily unavailable. Please try again.': 'errors.unavailable',
  'Your session has expired. Sign in again to continue.': 'errors.sessionExpired',
  'Your session has expired. Sign in again to keep editing.': 'errors.sessionExpired',
  'An account with this email already exists. Try signing in instead.': 'errors.emailInUse',
  'Email or password is incorrect.': 'errors.invalidCredentials',
  'Too many sign-in attempts. Please wait a few minutes and try again.': 'errors.tooManySignIn',
  'This account has been disabled.': 'errors.accountDisabled',
  'Sign-in is not configured correctly for this deployment.': 'errors.authMisconfigured',
  'You do not have permission to create boards.': 'errors.createWorkspaceForbidden',
  'You do not have permission to delete this board.': 'errors.deleteWorkspaceForbidden',
  'We could not delete this board. Please try again.': 'errors.deleteWorkspaceFailed',
  'We could not update this board. Please try again.': 'errors.updateWorkspaceFailed',
  'Check the board details and try again.': 'errors.updateWorkspaceInvalid',
  'You do not have permission to duplicate this board.': 'errors.duplicateWorkspaceForbidden',
  'We could not duplicate this board. Please try again.': 'errors.duplicateWorkspaceFailed',
  'You are already a member of this board.': 'errors.alreadyMember',
  'We could not load your boards. Please try again.': 'errors.loadWorkspaces',
  'The board does not exist.': 'errors.workspaceNotFound',
  'You do not have permission to view this board.': 'errors.boardViewForbidden',
  'Live collaboration is offline. Changes from other people may not appear.':
    'errors.collaborationOffline',
  'We could not keep the board in sync. Reconnecting automatically.': 'errors.collaborationSync',
  'We could not save your changes. Check your connection.': 'errors.saveNetwork',
  'We could not save your latest changes. Please try again.': 'errors.saveFailed',
  'You do not have permission to edit this board.': 'errors.saveForbidden',
  'We could not save your latest changes.': 'errors.saveGeneric',
  'We could not add that element. Check the details and try again.': 'errors.addElementInvalid',
  'We could not add that element. Please try again.': 'errors.addElementGeneric',
  'Choose a PNG, JPEG, WebP or GIF image.': 'errors.imageInvalidType',
  'Images must be 5 MB or smaller.': 'errors.imageTooLarge',
  'You do not have permission to view the members of this board.': 'errors.listMembersForbidden',
  'This board does not exist or you no longer have access to it.': 'errors.workspaceGone',
  'You do not have permission to change member roles in this board.': 'errors.changeRoleForbidden',
  'That person is no longer a member of this board.': 'errors.memberGone',
  'Choose a valid role.': 'errors.invalidRole',
  'You do not have permission to remove members from this board.': 'errors.removeForbidden',
  'You do not have permission to leave this board.': 'errors.leaveForbidden',
  'You are no longer a member of this board.': 'errors.noLongerMember',
  'You do not have permission to invite members to this board.': 'errors.inviteForbidden',
  'There is already a pending invitation for this email.': 'errors.invitationExists',
  'This invitation link is invalid or has already been used.': 'errors.invitationInvalid',
  'This invitation has expired. Ask the board owner for a new one.': 'errors.invitationExpired',
  'This invitation was issued for a different email address. Sign in with the invited email.':
    'errors.invitationEmailMismatch',
  'Verify your email address before accepting this invitation.':
    'errors.invitationEmailNotVerified',
  'You already have access to this board.': 'errors.alreadyAccess',
  'We could not add you to this board. Please try again or ask for a new invitation.':
    'errors.invitationAcceptForbidden',
  'This invitation link is not valid.': 'errors.invitationLinkInvalid',
  'You do not have permission to view the invitations of this board.': 'errors.inviteListForbidden',
  'Only the board owner can create a view link.': 'share.guest.ownerOnlyCreate',
  'Only the board owner can revoke the view link.': 'share.guest.ownerOnlyRevoke',
  'Only the board owner can manage the view link.': 'share.guest.ownerOnlyManage',
  'This view link is no longer available. Ask the owner for a new one.':
    'guest.revoked.description',
  'This view link no longer exists.': 'share.guest.notFound',
  'This board no longer exists.': 'share.guest.workspaceGone',
  'Saving…': 'errors.syncSaving',
  Saved: 'errors.syncSaved',
  'Not saved': 'errors.syncNotSaved',
  'Reconnecting…': 'errors.reconnecting',
};

export function localizeMessage(t: I18nContextValue['t'], message: string): string {
  const key = MESSAGE_KEYS[message];
  return key === undefined ? message : t(key);
}
