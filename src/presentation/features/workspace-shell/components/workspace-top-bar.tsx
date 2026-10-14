import { Avatar, Badge, Button, Heading, Inline, Text } from '@raulrod/ui';
import { ArrowLeft } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import type { LogoutUser } from '../../../../application/commands';
import type { PersistenceSyncStatus } from '../../../../application/services';
import type { Presence } from '../../../../domain/collaboration';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { AccountMenu } from '../../auth/account-menu';
import { describeConnectionStatus, describeSyncStatus } from '../workspace-sync-status';

const MAX_PRESENCE_AVATARS = 4;

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const Header = styled.header`
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[6]}`};
`;

const PresenceRow = styled.span`
  display: inline-flex;
  align-items: center;
`;

const PresenceItem = styled.span`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.color.background.default};

  &:not(:first-child) {
    margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
  }
`;

function presenceLabel(userId: string): string {
  return userId.length <= 8 ? userId : userId.slice(-8);
}

export interface WorkspaceTopBarProps {
  readonly workspace: Workspace;
  readonly role: MembershipRole | undefined;
  readonly onBack: () => void;
  readonly syncStatus: PersistenceSyncStatus;
  readonly connectionStatus: RealtimeConnectionStatus;
  readonly connectedUsers: readonly Presence[];
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly onInvite?: () => void;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
}

export function WorkspaceTopBar({
  workspace,
  role,
  onBack,
  syncStatus,
  connectionStatus,
  connectedUsers,
  currentUser,
  logoutUser,
  onInvite,
  persistenceErrorMessage,
  collaborationErrorMessage,
}: WorkspaceTopBarProps): ReactNode {
  const syncBadge = describeSyncStatus(syncStatus);
  const connectionBadge = describeConnectionStatus(connectionStatus);
  const visibleUsers = connectedUsers.slice(0, MAX_PRESENCE_AVATARS);

  return (
    <Header>
      <Inline justify="between" align="center" wrap gap="space-3">
        <Inline gap="space-3" align="center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Back to workspaces"
          >
            <Inline gap="space-2" align="center">
              <ArrowLeft aria-hidden="true" size={16} />
              <Text>Workspaces</Text>
            </Inline>
          </Button>
          <Heading as="h1">{workspace.name}</Heading>
          {role === undefined ? null : <Badge variant="neutral">{ROLE_LABELS[role]}</Badge>}
          {syncBadge === null ? null : (
            <span role="status" aria-live="polite">
              <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
            </span>
          )}
          {connectionBadge === null ? null : (
            <span role="status" aria-live="polite">
              <Badge variant={connectionBadge.variant}>{connectionBadge.label}</Badge>
            </span>
          )}
        </Inline>
        <Inline gap="space-3" align="center">
          {connectedUsers.length === 0 ? null : (
            <Inline gap="space-2" align="center" data-testid="connected-users">
              <PresenceRow aria-hidden="true">
                {visibleUsers.map((presence) => (
                  <PresenceItem key={presence.userId.value}>
                    <Avatar name={presenceLabel(presence.userId.value)} size="sm" />
                  </PresenceItem>
                ))}
              </PresenceRow>
              <Text role="status" aria-live="polite" color="color.text.muted" size="font.size.sm">
                {connectedUsers.length} connected
              </Text>
            </Inline>
          )}
          {onInvite === undefined ? null : (
            <Button type="button" variant="secondary" size="sm" onClick={onInvite}>
              Invite
            </Button>
          )}
          <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
        </Inline>
      </Inline>
      {persistenceErrorMessage === null ? null : (
        <Text role="alert" color="color.text.danger">
          {persistenceErrorMessage}
        </Text>
      )}
      {collaborationErrorMessage === null ? null : (
        <Text role="alert" color="color.text.danger">
          {collaborationErrorMessage}
        </Text>
      )}
    </Header>
  );
}
