import { Avatar, Badge, Button, IconButton, Inline, Text, Tooltip } from '@raulrod/ui';
import { ArrowLeft, Share2 } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import type { LogoutUser, UpdateWorkspaceResult } from '../../../../application/commands';
import type { PersistenceSyncStatus } from '../../../../application/services';
import type { Presence } from '../../../../domain/collaboration';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { AccountMenu } from '../../auth/account-menu';
import { describeConnectionStatus, describeSyncStatus } from '../workspace-sync-status';
import { SyncStatusIndicator } from './sync-status-indicator';
import { WorkspaceTitleField } from './workspace-title-field';

const MAX_PRESENCE_AVATARS = 4;

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const Overlay = styled.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  pointer-events: none;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  min-width: 0;
`;

const Cluster = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
  max-width: max(200px, calc(50% - 200px));
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.canvas.surface};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  pointer-events: auto;
`;

const ErrorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  align-self: flex-start;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.default};
  border: 1px solid ${({ theme }) => theme.color.border.danger};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  pointer-events: auto;
`;

const PresenceRow = styled.span`
  display: inline-flex;
  align-items: center;
`;

const PresenceItem = styled.span`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.canvas.surface};

  &:not(:first-child) {
    margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
  }
`;

const BackButton = styled(Button)`
  flex: none;
`;

const ShareButton = styled(IconButton)`
  flex: none;
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
  readonly onShare?: () => void;
  readonly onRename?: (name: string) => Promise<UpdateWorkspaceResult>;
  readonly readOnly?: boolean;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
  readonly creationErrorMessage: string | null;
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
  onShare,
  onRename,
  readOnly = false,
  persistenceErrorMessage,
  collaborationErrorMessage,
  creationErrorMessage,
}: WorkspaceTopBarProps): ReactNode {
  const syncBadge = describeSyncStatus(syncStatus);
  const connectionBadge = describeConnectionStatus(connectionStatus);
  const visibleUsers = connectedUsers.slice(0, MAX_PRESENCE_AVATARS);
  const hasErrors =
    persistenceErrorMessage !== null ||
    collaborationErrorMessage !== null ||
    creationErrorMessage !== null;

  return (
    <Overlay>
      <Row>
        <Cluster>
          <BackButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Back to workspaces"
          >
            <ArrowLeft aria-hidden="true" size={16} />
          </BackButton>
          <WorkspaceTitleField name={workspace.name} onRename={onRename} />
          {role === undefined ? (
            readOnly ? (
              <Badge variant="warning">View only</Badge>
            ) : null
          ) : (
            <Badge variant="neutral">{ROLE_LABELS[role]}</Badge>
          )}
          {syncBadge === null ? null : <SyncStatusIndicator status={syncBadge} />}
          {connectionBadge === null ? null : (
            <span role="status" aria-live="polite">
              <Badge variant={connectionBadge.variant}>{connectionBadge.label}</Badge>
            </span>
          )}
        </Cluster>
        <Cluster>
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
          {onShare === undefined ? null : (
            <Tooltip content="Share" placement="bottom">
              <ShareButton
                type="button"
                variant="secondary"
                size="sm"
                label="Share"
                onClick={onShare}
              >
                <Share2 aria-hidden="true" size={16} />
              </ShareButton>
            </Tooltip>
          )}
          <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
        </Cluster>
      </Row>
      {hasErrors ? (
        <ErrorList>
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
          {creationErrorMessage === null ? null : (
            <Text role="alert" color="color.text.danger">
              {creationErrorMessage}
            </Text>
          )}
        </ErrorList>
      ) : null}
    </Overlay>
  );
}
