export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

const VALID_STATUSES: readonly InvitationStatus[] = ['pending', 'accepted', 'revoked'] as const;

export function isValidInvitationStatus(status: unknown): status is InvitationStatus {
  return typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status);
}

export function validateInvitationStatus(status: unknown): InvitationStatus {
  if (!isValidInvitationStatus(status)) {
    throw new Error('Invalid invitation status');
  }
  return status;
}
