import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@raulrod/ui';
import { Bell } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { useI18n } from '../../../i18n';
import type { PendingInvitationsLoadStatus } from '../pending-invitations-provider';
import { PendingInvitationsPanel } from './pending-invitations-panel';

const Trigger = styled(Dialog.Trigger)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[10]};
  height: ${({ theme }) => theme.space[10]};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: var(--cach-control-hover);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const BadgeSlot = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  transform: translate(35%, -25%);
`;

const Content = styled(DialogContent)`
  && {
    max-width: 34rem;
  }
`;

export interface InvitationsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly status: PendingInvitationsLoadStatus;
  readonly invitations: readonly Invitation[];
  readonly loadError: string | null;
  readonly actionError: string | null;
  readonly needsVerification: boolean;
  readonly verificationSent: boolean;
  readonly acceptingId: string | null;
  readonly onAccept: (invitation: Invitation) => void;
  readonly onRetry: () => void;
  readonly onSendVerification: () => void;
}

export function InvitationsDialog({
  open,
  onOpenChange,
  status,
  invitations,
  loadError,
  actionError,
  needsVerification,
  verificationSent,
  acceptingId,
  onAccept,
  onRetry,
  onSendVerification,
}: InvitationsDialogProps): ReactNode {
  const { t } = useI18n();
  const count = invitations.length;
  const label =
    count > 0 ? t('shell.notifications.labelWithCount', { count }) : t('shell.notifications.label');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Trigger aria-label={label} data-testid="notifications-button">
        <Bell aria-hidden="true" size={20} />
        {count > 0 ? (
          <BadgeSlot>
            <Badge variant="info" aria-hidden="true">
              {count}
            </Badge>
          </BadgeSlot>
        ) : null}
      </Trigger>
      {count > 0 ? <VisuallyHidden aria-live="polite">{label}</VisuallyHidden> : null}
      <Content>
        <DialogHeader>
          <DialogTitle>{t('shell.notifications.title')}</DialogTitle>
          <DialogDescription>{t('shell.notifications.description')}</DialogDescription>
        </DialogHeader>
        <PendingInvitationsPanel
          status={status}
          invitations={invitations}
          loadError={loadError}
          actionError={actionError}
          needsVerification={needsVerification}
          verificationSent={verificationSent}
          acceptingId={acceptingId}
          onAccept={onAccept}
          onRetry={onRetry}
          onSendVerification={onSendVerification}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </Content>
    </Dialog>
  );
}
