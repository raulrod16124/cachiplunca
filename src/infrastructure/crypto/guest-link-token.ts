import type { IssuedGuestLinkToken } from '../../application/commands/create-guest-link';
import { createSecureTokenIssuer, hashSecureToken } from './secure-token';

export type IssueGuestLinkToken = () => Promise<IssuedGuestLinkToken>;

export function createGuestLinkTokenIssuer(): IssueGuestLinkToken {
  return createSecureTokenIssuer();
}

export function hashGuestLinkToken(token: string): Promise<string> {
  return hashSecureToken(token);
}
