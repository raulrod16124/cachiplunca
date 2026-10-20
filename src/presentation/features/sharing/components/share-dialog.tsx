import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Heading,
  Stack,
  Tabs,
} from '@raulrod/ui';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type {
  ChangeMemberRole,
  InviteMember,
  LeaveWorkspace,
  RemoveMember,
} from '../../../../application/commands';
import type { ListPendingInvitations, ListWorkspaceMembers } from '../../../../application/queries';
import type { GuestLinkServices } from '../../../../application/guest-link-services';
import type { Membership, MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { InvitePanel } from '../../invitations';
import {
  describeChangeMemberRoleError,
  describeLeaveWorkspaceError,
  describeListMembersError,
  describeRemoveMemberError,
} from '../share-error-messages';
import { MembersList, type MembersStatus } from './members-list';
import { GuestLinkPanel } from './guest-link-panel';
import { localizeMessage, useI18n } from '../../../i18n';

const INVITE_TAB = 'invite';
const PEOPLE_TAB = 'people';
const VIEW_LINK_TAB = 'view-link';

export interface ShareDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspaceId: string;
  readonly currentUserId: string;
  readonly canInvite: boolean;
  readonly canChangeRole: boolean;
  readonly canRemove: boolean;
  readonly canLeave: boolean;
  readonly listWorkspaceMembers: ListWorkspaceMembers;
  readonly leaveWorkspace: LeaveWorkspace;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly guestLinks?: GuestLinkServices;
  readonly canManageGuestLinks?: boolean;
  readonly onLeft: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  workspaceId,
  currentUserId,
  canInvite,
  canChangeRole,
  canRemove,
  canLeave,
  listWorkspaceMembers,
  leaveWorkspace,
  changeMemberRole,
  removeMember,
  inviteMember,
  listPendingInvitations,
  guestLinks,
  canManageGuestLinks = false,
  onLeft,
}: ShareDialogProps): ReactNode {
  const { t } = useI18n();
  const canShowInvite =
    canInvite && inviteMember !== undefined && listPendingInvitations !== undefined;
  const canShowGuestLink = canManageGuestLinks && guestLinks !== undefined;
  const defaultTab = canShowInvite ? INVITE_TAB : PEOPLE_TAB;

  const [tab, setTab] = useState<string>(defaultTab);
  const [status, setStatus] = useState<MembersStatus>('loading');
  const [members, setMembers] = useState<readonly Membership[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const fetchMembers = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await listWorkspaceMembers(workspaceId);
      if (result.status === 'ok') {
        setMembers(result.members);
        setStatus('ready');
        return;
      }
      setErrorMessage(localizeMessage(t, describeListMembersError(result.error)));
      setStatus('error');
    } catch (error) {
      setErrorMessage(localizeMessage(t, describeListMembersError(toAppError(error))));
      setStatus('error');
    }
  }, [listWorkspaceMembers, workspaceId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTab(defaultTab);
    setActionError(null);
    void fetchMembers();
  }, [open, defaultTab, fetchMembers]);

  const handleChangeRole = useCallback(
    async (userId: string, role: MembershipRole): Promise<void> => {
      if (changeMemberRole === undefined) {
        return;
      }
      setPendingUserId(userId);
      setActionError(null);
      try {
        const result = await changeMemberRole({
          workspaceId: WorkspaceId.create(workspaceId),
          actorUserId: UserId.create(currentUserId),
          targetUserId: UserId.create(userId),
          role,
        });
        if (result.status === 'ok') {
          await fetchMembers();
        } else if (result.status === 'invalid-input') {
          setActionError('Choose a valid role.');
        } else {
          setActionError(localizeMessage(t, describeChangeMemberRoleError(result.error)));
        }
      } catch (error) {
        setActionError(localizeMessage(t, describeChangeMemberRoleError(toAppError(error))));
      } finally {
        setPendingUserId(null);
      }
    },
    [changeMemberRole, currentUserId, fetchMembers, workspaceId],
  );

  const handleRemove = useCallback(
    async (userId: string): Promise<void> => {
      if (removeMember === undefined) {
        return;
      }
      setPendingUserId(userId);
      setActionError(null);
      try {
        const result = await removeMember({
          workspaceId: WorkspaceId.create(workspaceId),
          actorUserId: UserId.create(currentUserId),
          targetUserId: UserId.create(userId),
        });
        if (result.status === 'ok') {
          await fetchMembers();
        } else {
          setActionError(localizeMessage(t, describeRemoveMemberError(result.error)));
        }
      } catch (error) {
        setActionError(localizeMessage(t, describeRemoveMemberError(toAppError(error))));
      } finally {
        setPendingUserId(null);
      }
    },
    [removeMember, currentUserId, fetchMembers, workspaceId],
  );

  const handleLeave = useCallback(async (): Promise<void> => {
    setPendingUserId(currentUserId);
    setActionError(null);
    try {
      const result = await leaveWorkspace({
        workspaceId: WorkspaceId.create(workspaceId),
        userId: UserId.create(currentUserId),
      });
      if (result.status === 'ok') {
        onLeft();
        return;
      }
      setActionError(localizeMessage(t, describeLeaveWorkspaceError(result.error)));
    } catch (error) {
      setActionError(localizeMessage(t, describeLeaveWorkspaceError(toAppError(error))));
    } finally {
      setPendingUserId(null);
    }
  }, [leaveWorkspace, currentUserId, workspaceId, onLeft]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      classNames={{ content: 'share-dialog-content' }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>{t('share.description')}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List>
            {canShowInvite ? (
              <Tabs.Trigger value={INVITE_TAB}>{t('share.tabs.invite')}</Tabs.Trigger>
            ) : null}
            <Tabs.Trigger value={PEOPLE_TAB}>{t('share.tabs.people')}</Tabs.Trigger>
            {canShowGuestLink ? (
              <Tabs.Trigger value={VIEW_LINK_TAB}>{t('share.tabs.viewLink')}</Tabs.Trigger>
            ) : null}
          </Tabs.List>
          {canShowInvite && inviteMember !== undefined && listPendingInvitations !== undefined ? (
            <Tabs.Panel value={INVITE_TAB}>
              <InvitePanel
                active={open && tab === INVITE_TAB}
                workspaceId={workspaceId}
                invitedBy={UserId.create(currentUserId)}
                inviteMember={inviteMember}
                listPendingInvitations={listPendingInvitations}
              />
            </Tabs.Panel>
          ) : null}
          <Tabs.Panel value={PEOPLE_TAB}>
            <Stack gap="space-3">
              <Heading as="h3">{t('share.members')}</Heading>
              <MembersList
                status={status}
                members={members}
                currentUserId={currentUserId}
                errorMessage={errorMessage}
                actionError={actionError}
                pendingUserId={pendingUserId}
                canChangeRole={canChangeRole}
                canRemove={canRemove}
                canLeave={canLeave}
                onChangeRole={(userId, role) => void handleChangeRole(userId, role)}
                onRemove={(userId) => void handleRemove(userId)}
                onLeave={() => void handleLeave()}
                onRetry={() => void fetchMembers()}
              />
            </Stack>
          </Tabs.Panel>
          {canShowGuestLink && guestLinks !== undefined ? (
            <Tabs.Panel value={VIEW_LINK_TAB}>
              <GuestLinkPanel
                active={open && tab === VIEW_LINK_TAB}
                workspaceId={workspaceId}
                currentUserId={currentUserId}
                services={guestLinks}
              />
            </Tabs.Panel>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
