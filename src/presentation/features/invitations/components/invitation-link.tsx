import { Button, Input, Stack, Text } from '@raulrod/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { getPublicBasePath } from '../../../config/public-base';
import { useI18n } from '../../../i18n';

export const INVITATION_ACCEPT_PATH = '/invitations';

export function buildInvitationLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  const basePath = getPublicBasePath();
  const path = basePath === '/' ? INVITATION_ACCEPT_PATH : `${basePath}${INVITATION_ACCEPT_PATH}`;
  return `${base}${path}/${token}`;
}

export interface InvitationLinkProps {
  readonly token: string;
  readonly buildLink?: (token: string) => string;
}

export function InvitationLink({
  token,
  buildLink = buildInvitationLink,
}: InvitationLinkProps): ReactNode {
  const { t } = useI18n();
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
      <Text color="color.text.muted">{t('share.invite.linkHint')}</Text>
      <Input
        readOnly
        aria-label="Invitation link"
        value={link}
        onFocus={(event) => event.target.select()}
      />
      <Stack gap="space-1">
        <Button type="button" variant="outline" onClick={handleCopy}>
          {t('common.copyLink')}
        </Button>
        {copied && (
          <Text role="status" aria-live="polite" color="color.text.muted">
            {t('common.copied')}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
