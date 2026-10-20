import { Button, Heading, Stack, Text } from '@raulrod/ui';
import { Mail } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { useI18n } from '../../../i18n';

const Notice = styled.section`
  position: fixed;
  right: ${({ theme }) => theme.space[4]};
  bottom: ${({ theme }) => theme.space[4]};
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  width: min(360px, calc(100vw - ${({ theme }) => theme.space[8]}));
  padding: ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.background.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
`;

const NoticeHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
`;

export interface InvitationNoticeProps {
  readonly invitation: Invitation;
  readonly accepting: boolean;
  readonly onAccept: () => void;
  readonly onDismiss: () => void;
}

export function InvitationNotice({
  invitation,
  accepting,
  onAccept,
  onDismiss,
}: InvitationNoticeProps): ReactNode {
  const { t } = useI18n();
  const workspaceName = t('workspaces.pending.workspaceLabel');

  return (
    <Notice role="status" aria-label={t('invitations.notice.title')}>
      <NoticeHeading>
        <Mail aria-hidden="true" size={18} />
        <Stack gap="space-1">
          <Heading as="h2">{t('invitations.notice.title')}</Heading>
          <Text color="color.text.muted" size="font.size.sm">
            {t('invitations.notice.description', {
              workspace: workspaceName,
              role: invitation.role,
            })}
          </Text>
        </Stack>
      </NoticeHeading>
      <Actions>
        <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
          {t('invitations.notice.dismiss')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={accepting}
          disabled={accepting}
          onClick={onAccept}
        >
          {t('workspaces.pending.accept')}
        </Button>
      </Actions>
    </Notice>
  );
}
