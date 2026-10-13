import { Button, Input, Stack, Text } from '@raulrod/ui';
import { useMemo, useState, type ReactNode } from 'react';

export const INVITATION_ACCEPT_PATH = '/invitations';

export function buildInvitationLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return `${base}${INVITATION_ACCEPT_PATH}/${token}`;
}

export interface InvitationLinkProps {
  readonly token: string;
  readonly buildLink?: (token: string) => string;
}

export function InvitationLink({
  token,
  buildLink = buildInvitationLink,
}: InvitationLinkProps): ReactNode {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => buildLink(token), [buildLink, token]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Stack gap="space-2">
      <Text color="color.text.muted">Share this one-time link. It will not be shown again.</Text>
      <Input
        readOnly
        aria-label="Invitation link"
        value={link}
        onFocus={(event) => event.target.select()}
      />
      <Stack gap="space-1">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          Copy link
        </Button>
        {copied && (
          <Text role="status" aria-live="polite" color="color.text.muted">
            Link copied to clipboard.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
