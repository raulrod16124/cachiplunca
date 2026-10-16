/**
 * @jest-environment node
 */
import {
  createInvitationTokenIssuer,
  hashInvitationToken,
} from '../../../../infrastructure/crypto/invitation-token';

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const HEX_PATTERN = /^[0-9a-f]{64}$/;

describe('hashInvitationToken', () => {
  it('produces a deterministic SHA-256 hex digest', async () => {
    const first = await hashInvitationToken('a-token');
    const second = await hashInvitationToken('a-token');

    expect(first).toBe(second);
    expect(first).toMatch(HEX_PATTERN);
  });

  it('produces different digests for different tokens', async () => {
    await expect(hashInvitationToken('a-token')).resolves.not.toBe(
      await hashInvitationToken('another-token'),
    );
  });
});

describe('createInvitationTokenIssuer', () => {
  it('issues a URL-safe token and its matching hash', async () => {
    const issue = createInvitationTokenIssuer();

    const issued = await issue();

    expect(issued.token).toMatch(BASE64URL_PATTERN);
    expect(issued.tokenHash).toMatch(HEX_PATTERN);
    await expect(hashInvitationToken(issued.token)).resolves.toBe(issued.tokenHash);
  });

  it('issues a different token on every call', async () => {
    const issue = createInvitationTokenIssuer();

    const first = await issue();
    const second = await issue();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});
