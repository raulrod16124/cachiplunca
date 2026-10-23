import { useMemo, type ReactNode } from 'react';
import { CopyLinkField } from '../../../components/copy-link-field';
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
  const link = useMemo(() => buildLink(token), [buildLink, token]);

  return (
    <CopyLinkField
      link={link}
      label={t('invitations.linkLabel')}
      hint={t('share.invite.linkHint')}
    />
  );
}
