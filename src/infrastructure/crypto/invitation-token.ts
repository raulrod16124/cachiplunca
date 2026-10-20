import type { IssuedInvitationToken } from '../../application/commands/invite-member';
import { createSecureTokenIssuer, hashSecureToken } from './secure-token';

export type IssueInvitationToken = () => Promise<IssuedInvitationToken>;

export function createInvitationTokenIssuer(): IssueInvitationToken {
  return createSecureTokenIssuer();
}

export function hashInvitationToken(token: string): Promise<string> {
  return hashSecureToken(token);
}
