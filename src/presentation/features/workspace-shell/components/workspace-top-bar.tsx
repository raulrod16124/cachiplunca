import {
  Avatar,
  Badge,
  DropdownMenu,
  Inline,
  Popover,
  Text,
  Tooltip,
  VisuallyHidden,
} from '@raulrod/ui';
import {
  ArrowLeft,
  CircleQuestionMark,
  Download,
  Ellipsis,
  FileJson,
  FileText,
  ListChecks,
  MessageSquare,
  Presentation,
  Share2,
  TriangleAlert,
} from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import type { LogoutUser } from '../../../../application/commands';
import type { PersistenceSyncStatus } from '../../../../application/services';
import type { Presence } from '../../../../domain/collaboration';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { NeutralButton, NeutralIconButton } from '../../../components';
import { WorkspaceCover } from '../../../components/workspace-cover';
import {
  presenceColorFor,
  PRESENCE_TEXT_COLOR,
  presenceLabel,
  shortUserId,
  userDetailedLabel,
} from '../../../collaboration';
import { AvatarGroup } from '../../../components';
import { AccountMenu } from '../../auth/account-menu';
import { useMediaQuery } from '../../../hooks/use-media-query';
import { localizeMessage, useI18n, type TranslationKey } from '../../../i18n';
import { describeConnectionStatus, describeSyncStatus } from '../workspace-sync-status';
import { SessionTimer } from './session-timer';
import { SyncStatusIndicator } from './sync-status-indicator';
import { WorkspaceTitleField } from './workspace-title-field';

const ROLE_KEYS: Record<MembershipRole, TranslationKey> = {
  owner: 'share.role.owner',
  editor: 'share.role.editor',
  viewer: 'share.role.viewer',
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

  @media (max-width: 900px) {
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  }
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
  min-width: 0;

  @media (max-width: 900px) {
    gap: ${({ theme }) => theme.space[1]};
  }
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

  @media (max-width: 900px) {
    max-width: 100%;
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
  align-self: flex-start;
  max-width: min(560px, 100%);
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.destructive};
  border: 1px solid ${({ theme }) => theme.color.border.danger};
  color: ${({ theme }) => theme.color.text.danger};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  pointer-events: auto;
`;

const ErrorIcon = styled.span`
  display: inline-flex;
  flex: none;
  color: ${({ theme }) => theme.color.text.danger};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ErrorList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
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
    background: var(--cach-control-hover);
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

const BackButton = styled(NeutralButton)`
  flex: none;
`;

const TopbarCover = styled.span`
  display: block;
  flex: none;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const TopbarButton = styled(NeutralIconButton)`
  flex: none;
`;

const MenuTrigger = styled(DropdownMenu.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: ${({ theme }) => theme.font.leading.none};
  letter-spacing: ${({ theme }) => theme.font.tracking.normal};
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard};

  &:hover:not(:disabled) {
    background: var(--cach-control-hover);
  }

  &:active:not(:disabled) {
    background: var(--cach-control-active);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    background: ${({ theme }) => theme.color.action.disabled.background};
    color: ${({ theme }) => theme.color.action.disabled.text};
    cursor: not-allowed;
  }
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
  readonly planOpen?: boolean;
  readonly onTogglePlan?: () => void;
  readonly commentsOpen?: boolean;
  readonly onToggleComments?: () => void;
  readonly onPresent?: () => void;
  readonly canPresent?: boolean;
  readonly onShowShortcuts?: () => void;
  readonly onExportJson?: () => void;
  readonly onExportPdf?: () => void;
  readonly readOnly?: boolean;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
  readonly creationErrorMessage: string | null;
  readonly exportErrorMessage?: string | null;
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
  planOpen = false,
  onTogglePlan,
  commentsOpen = false,
  onToggleComments,
  onPresent,
  canPresent = false,
  onShowShortcuts,
  onExportJson,
  onExportPdf,
  readOnly = false,
  persistenceErrorMessage,
  collaborationErrorMessage,
  creationErrorMessage,
  exportErrorMessage = null,
}: WorkspaceTopBarProps): ReactNode {
  const { t } = useI18n();
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const syncBadge = describeSyncStatus(syncStatus);
  const connectionBadge = describeConnectionStatus(connectionStatus);
  const localizedSyncBadge =
    syncBadge === null ? null : { ...syncBadge, label: localizeMessage(t, syncBadge.label) };
  const localizedConnectionBadge =
    connectionBadge === null
      ? null
      : { ...connectionBadge, label: localizeMessage(t, connectionBadge.label) };
  const colorFor = (userId: string): string => userColors?.get(userId) ?? presenceColorFor(userId);
  const visibleUsers = connectedUsers.map((presence) => {
    const userId = presence.userId.value;

    return {
      id: userId,
      name: presenceLabel(presence),
      description: userDetailedLabel(presence.displayName, userId),
      color: colorFor(userId),
      testId: `presence-avatar-${userId}`,
    };
  });
  const connectedLabel = t('canvas.topbar.connected', { count: connectedUsers.length });
  const errorMessages = [
    persistenceErrorMessage,
    collaborationErrorMessage,
    creationErrorMessage,
    exportErrorMessage,
  ].filter((message): message is string => message !== null);
  const canExport = onExportJson !== undefined && onExportPdf !== undefined;
  const hasMoreActions =
    isNarrow && (onPresent !== undefined || canExport || onShowShortcuts !== undefined);

  return (
    <Overlay data-testid="workspace-topbar">
      <Row>
        <Cluster>
          <BackButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('canvas.topbar.back')}
          >
            <ArrowLeft aria-hidden="true" size={16} />
          </BackButton>
          <TopbarCover data-testid="workspace-cover-topbar">
            <WorkspaceCover url={workspace.coverImageUrl} loading="eager" iconSize={16} />
          </TopbarCover>
          <WorkspaceTitleField name={workspace.name} />
          {role === undefined ? (
            readOnly ? (
              <Badge variant="warning">{t('canvas.topbar.viewOnly')}</Badge>
            ) : null
          ) : (
            <Badge variant="neutral">{t(ROLE_KEYS[role])}</Badge>
          )}
          {localizedSyncBadge === null ? null : <SyncStatusIndicator status={localizedSyncBadge} />}
          {localizedConnectionBadge === null ? null : (
            <span role="status" aria-live="polite">
              <Badge variant={localizedConnectionBadge.variant}>
                {localizedConnectionBadge.label}
              </Badge>
            </span>
          )}
        </Cluster>
        <Cluster>
          {connectedUsers.length === 0 ? null : (
            <Inline gap="space-1" align="center">
              <Popover>
                <PresenceTrigger
                  data-testid="connected-users"
                  aria-label={t('canvas.topbar.showParticipants', { count: connectedUsers.length })}
                >
                  <AvatarGroup items={visibleUsers} decorative />
                  <Text color="color.text.primary" size="font.size.sm" weight="font.weight.medium">
                    {connectedLabel}
                  </Text>
                </PresenceTrigger>
                <Popover.Content placement="bottom-end">
                  <PresencePanel>
                    <Popover.Title>{t('canvas.topbar.connectedPeople')}</Popover.Title>
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
                              styles={{ backgroundColor: color, color: PRESENCE_TEXT_COLOR }}
                            />
                            <PresenceIdentity>
                              <Text weight="font.weight.medium">{label}</Text>
                              {label === shortId ? null : (
                                <Text color="color.text.muted" size="font.size.sm">
                                  {t('canvas.topbar.id', { id: shortId })}
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
                {t('canvas.topbar.participants', { count: connectedUsers.length })}
              </VisuallyHidden>
            </Inline>
          )}
          {onTogglePlan === undefined ? null : (
            <Tooltip content={t('plan.title')} placement="bottom">
              <TopbarButton
                type="button"
                variant={planOpen ? 'primary' : 'ghost'}
                size="sm"
                label={t('plan.title')}
                aria-expanded={planOpen}
                aria-controls={planOpen ? 'task-plan-panel' : undefined}
                onClick={onTogglePlan}
              >
                <ListChecks aria-hidden="true" size={16} />
              </TopbarButton>
            </Tooltip>
          )}
          {onToggleComments === undefined ? null : (
            <Tooltip content={t('comments.open')} placement="bottom">
              <TopbarButton
                type="button"
                variant={commentsOpen ? 'primary' : 'ghost'}
                size="sm"
                label={t('comments.open')}
                aria-expanded={commentsOpen}
                aria-controls={commentsOpen ? 'comments-panel' : undefined}
                onClick={onToggleComments}
              >
                <MessageSquare aria-hidden="true" size={16} />
              </TopbarButton>
            </Tooltip>
          )}
          {isNarrow ? null : onPresent === undefined ? null : (
            <Tooltip
              content={canPresent ? t('presentation.start') : t('presentation.unavailable')}
              placement="bottom"
            >
              <TopbarButton
                type="button"
                variant="ghost"
                size="sm"
                label={t('presentation.start')}
                disabled={!canPresent}
                onClick={onPresent}
              >
                <Presentation aria-hidden="true" size={16} />
              </TopbarButton>
            </Tooltip>
          )}
          <SessionTimer />
          {onShare === undefined ? null : (
            <Tooltip content={t('canvas.topbar.share')} placement="bottom">
              <TopbarButton
                type="button"
                variant="ghost"
                size="sm"
                label={t('canvas.topbar.share')}
                onClick={onShare}
              >
                <Share2 aria-hidden="true" size={16} />
              </TopbarButton>
            </Tooltip>
          )}
          {canExport && !isNarrow ? (
            <DropdownMenu>
              <Tooltip content={t('canvas.export.label')} placement="bottom">
                <MenuTrigger aria-label={t('canvas.export.label')}>
                  <Download aria-hidden="true" size={16} />
                </MenuTrigger>
              </Tooltip>
              <DropdownMenu.Content placement="bottom-end">
                <DropdownMenu.Item
                  data-testid="export-json"
                  onSelect={onExportJson}
                  startIcon={<FileJson aria-hidden="true" size={16} />}
                >
                  {t('canvas.export.json')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  data-testid="export-pdf"
                  onSelect={onExportPdf}
                  startIcon={<FileText aria-hidden="true" size={16} />}
                >
                  {t('canvas.export.pdf')}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          ) : null}
          {onShowShortcuts === undefined || isNarrow ? null : (
            <Tooltip content={t('shortcuts.open')} placement="bottom">
              <TopbarButton
                type="button"
                variant="ghost"
                size="sm"
                label={t('shortcuts.open')}
                aria-keyshortcuts="?"
                onClick={onShowShortcuts}
              >
                <CircleQuestionMark aria-hidden="true" size={16} />
              </TopbarButton>
            </Tooltip>
          )}
          {hasMoreActions ? (
            <DropdownMenu>
              <Tooltip content={t('canvas.topbar.moreActions')} placement="bottom">
                <MenuTrigger
                  aria-label={t('canvas.topbar.moreActions')}
                  data-testid="topbar-more-actions"
                >
                  <Ellipsis aria-hidden="true" size={16} />
                </MenuTrigger>
              </Tooltip>
              <DropdownMenu.Content placement="bottom-end">
                {onPresent === undefined ? null : (
                  <DropdownMenu.Item
                    data-testid="topbar-present"
                    disabled={!canPresent}
                    onSelect={onPresent}
                    startIcon={<Presentation aria-hidden="true" size={16} />}
                  >
                    {t('presentation.start')}
                  </DropdownMenu.Item>
                )}
                {!canExport ? null : (
                  <>
                    <DropdownMenu.Item
                      data-testid="export-json"
                      onSelect={onExportJson}
                      startIcon={<FileJson aria-hidden="true" size={16} />}
                    >
                      {t('canvas.export.json')}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      data-testid="export-pdf"
                      onSelect={onExportPdf}
                      startIcon={<FileText aria-hidden="true" size={16} />}
                    >
                      {t('canvas.export.pdf')}
                    </DropdownMenu.Item>
                  </>
                )}
                {onShowShortcuts === undefined ? null : (
                  <DropdownMenu.Item
                    data-testid="topbar-shortcuts"
                    onSelect={onShowShortcuts}
                    startIcon={<CircleQuestionMark aria-hidden="true" size={16} />}
                  >
                    {t('shortcuts.open')}
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu>
          ) : null}
          <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
        </Cluster>
      </Row>
      {errorMessages.length === 0 ? null : (
        <ErrorBanner role="alert" aria-live="assertive" data-testid="workspace-errors">
          <ErrorIcon aria-hidden="true">
            <TriangleAlert aria-hidden="true" size={16} />
          </ErrorIcon>
          <ErrorList>
            {errorMessages.map((message, index) => (
              <li key={`${index}:${message}`}>
                <Text color="color.text.danger">{message}</Text>
              </li>
            ))}
          </ErrorList>
        </ErrorBanner>
      )}
    </Overlay>
  );
}
