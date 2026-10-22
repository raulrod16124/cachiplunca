import { useState, type ReactNode } from 'react';
import { usePendingInvitations } from '../pending-invitations-provider';
import { InvitationsDialog } from './invitations-dialog';

export function InvitationsButton(): ReactNode {
  const pendingInvitations = usePendingInvitations();
  const [open, setOpen] = useState(false);

  return (
    <InvitationsDialog
      open={open}
      onOpenChange={setOpen}
      status={pendingInvitations.status}
      invitations={pendingInvitations.invitations}
      loadError={pendingInvitations.loadError}
      actionError={pendingInvitations.actionError}
      needsVerification={pendingInvitations.needsVerification}
      verificationSent={pendingInvitations.verificationSent}
      acceptingId={pendingInvitations.acceptingId}
      onAccept={pendingInvitations.accept}
      onRetry={pendingInvitations.retry}
      onSendVerification={pendingInvitations.sendVerification}
    />
  );
}
