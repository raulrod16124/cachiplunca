import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Inline,
  Popover,
  Text,
  Tooltip,
  VisuallyHidden,
} from '@raulrod/ui';
import { ArrowLeft, Share2 } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import type { LogoutUser, UpdateWorkspaceResult } from '../../../../application/commands';
import type { PersistenceSyncStatus } from '../../../../application/services';
import type { Presence } from '../../../../domain/collaboration';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import {
  presenceColorFor,
  presenceLabel,
  shortUserId,
  userDetailedLabel,
} from '../../../collaboration';
import { AccountMenu } from '../../auth/account-menu';
import { describeConnectionStatus, describeSyncStatus } from '../workspace-sync-status';
import { SyncStatusIndicator } from './sync-status-indicator';
import { WorkspaceTitleField } from './workspace-title-field';

const MAX_PRESENCE_AVATARS = 4;
const AVATAR_TEXT_COLOR = '#ffffff';

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

const PresenceItem = styled(Tooltip)`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.canvas.surface};

  &:not(:first-child) {
    margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
  }

  &:focus-within {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.focusRing};
  }
`;

const PresenceOverflow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  padding: 0 ${({ theme }) => theme.space[1]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.canvas.surface};
  margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
`;

const PresenceTrigger = styled(Popover.Trigger)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[1]};
  padding-right: ${({ theme }) => theme.space[2]};
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: inherit;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const PresencePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 220px;
  max-width: 280px;
`;

const PresenceList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const PresenceListRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const PresenceIdentity = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;

  & > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const BackButton = styled(Button)`
  flex: none;
`;

const ShareButton = styled(IconButton)`
  flex: none;
`;

export interface WorkspaceTopBarProps {
  readonly workspace: Workspace;
  readonly role: MembershipRole | undefined;
  readonly onBack: () => void;
  readonly syncStatus: PersistenceSyncStatus;
  readonly connectionStatus: RealtimeConnectionStatus;
  readonly connectedUsers: readonly Presence[];
  readonly userColors?: ReadonlyMap<string, string>;
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
  userColors,
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
  const overflowUsers = connectedUsers.slice(MAX_PRESENCE_AVATARS);
  const connectedLabel = `${connectedUsers.length} connected`;
  const colorFor = (userId: string): string => userColors?.get(userId) ?? presenceColorFor(userId);
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
            <Inline gap="space-1" align="center">
              <Popover>
                <PresenceTrigger
                  data-testid="connected-users"
                  aria-label={`Participants: ${connectedLabel}. Show list`}
                >
                  <PresenceRow aria-hidden="true">
                    {visibleUsers.map((presence) => {
                      const userId = presence.userId.value;
                      const color = colorFor(userId);

                      return (
                        <PresenceItem
                          key={userId}
                          content={userDetailedLabel(presence.displayName, userId)}
                          placement="bottom"
                        >
                          <Avatar
                            name={presenceLabel(presence)}
                            size="sm"
                            data-testid={`presence-avatar-${userId}`}
                            data-user-color={color}
                            styles={{ backgroundColor: color, color: AVATAR_TEXT_COLOR }}
                          />
                        </PresenceItem>
                      );
                    })}
                    {overflowUsers.length === 0 ? null : (
                      <Tooltip
                        content={overflowUsers
                          .map((presence) =>
                            userDetailedLabel(presence.displayName, presence.userId.value),
                          )
                          .join(', ')}
                        placement="bottom"
                      >
                        <PresenceOverflow aria-hidden="true">
                          +{overflowUsers.length}
                        </PresenceOverflow>
                      </Tooltip>
                    )}
                  </PresenceRow>
                  <Text color="color.text.primary" size="font.size.sm" weight="font.weight.medium">
                    {connectedLabel}
                  </Text>
                </PresenceTrigger>
                <Popover.Content placement="bottom-end">
                  <PresencePanel>
                    <Popover.Title>Connected people</Popover.Title>
                    <PresenceList>
                      {connectedUsers.map((presence) => {
                        const userId = presence.userId.value;
                        const label = presenceLabel(presence);
                        const shortId = shortUserId(userId);
                        const color = colorFor(userId);

                        return (
                          <PresenceListRow key={userId}>
                            <Avatar
                              name={label}
                              size="sm"
                              styles={{ backgroundColor: color, color: AVATAR_TEXT_COLOR }}
                            />
                            <PresenceIdentity>
                              <Text weight="font.weight.medium">{label}</Text>
                              {label === shortId ? null : (
                                <Text color="color.text.muted" size="font.size.sm">
                                  ID {shortId}
                                </Text>
                              )}
                            </PresenceIdentity>
                          </PresenceListRow>
                        );
                      })}
                    </PresenceList>
                  </PresencePanel>
                </Popover.Content>
              </Popover>
              <VisuallyHidden role="status" aria-live="polite">
                {`Participants: ${connectedLabel}`}
              </VisuallyHidden>
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
