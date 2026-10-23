import { Button, Heading, IconButton, Input, Skeleton, Stack, Text, Tooltip } from '@raulrod/ui';
import { ArrowUpRight, Copy, Pencil, Search, Star, Trash2 } from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { can } from '../../../../domain/membership';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { Card } from '../../../components/card';
import { WorkspaceCover } from '../../../components/workspace-cover';
import { NeutralIconButton } from '../../../components/neutral-controls';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { DecorativeArrow, DecorativeSpark } from '../../../components/decorative';
import { formatRelativeDate, formatShortDate, useI18n } from '../../../i18n';
import { WorkspaceViewToggle, type WorkspaceViewMode } from './workspace-view-toggle';

const RESULTS_COUNT_ID = 'workspaces-results-count';
const EMPTY_WORKSPACE_IDS: ReadonlySet<string> = new Set();

const ListGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const CardContent = styled(Stack)`
  flex: 1;
  padding: ${({ theme }) => theme.space[4]};
  justify-content: space-between;
`;

const CoverHeader = styled.div`
  position: relative;
  flex: none;
  aspect-ratio: 16 / 7;
  min-height: 96px;
  max-height: 160px;
  overflow: hidden;
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
`;

const CardHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const CardTitle = styled(Heading)`
  font-size: ${({ theme }) => theme.font.size.lg};
  line-height: ${({ theme }) => theme.font.leading.tight};
  overflow-wrap: anywhere;
`;

const Description = styled(Text)`
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
`;

const CardActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const SearchControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1 1 260px;
  flex-wrap: wrap;
  min-width: 0;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1 1 260px;
  max-width: 420px;

  & > svg {
    position: absolute;
    top: 50%;
    left: ${({ theme }) => theme.space[3]};
    transform: translateY(-50%);
    color: ${({ theme }) => theme.color.text.muted};
    pointer-events: none;
  }

  & > input {
    width: 100%;
    padding-left: ${({ theme }) => theme.space[8]};
  }
`;

const ListRows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
`;

const ListItemLayout = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};

  @media (max-width: 700px) {
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: ${({ theme }) => theme.space[3]};
  }
`;

const ListCover = styled.div`
  position: relative;
  width: ${({ theme }) => theme.space[12]};
  height: ${({ theme }) => theme.space[12]};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ListTitle = styled(CardTitle)`
  margin: 0;
`;

const ListActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[1]};
  flex-wrap: wrap;

  @media (max-width: 700px) {
    grid-column: 2;
    justify-content: flex-start;
  }
`;

const ListMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
`;

const MetaDot = styled.span`
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1;
`;

interface WorkspaceActionAvailability {
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canDuplicate: boolean;
}

function resolveWorkspaceActionAvailability(
  role: MembershipRole | undefined,
  onEdit: ((workspace: Workspace) => void) | undefined,
  onRequestDelete: ((workspace: Workspace) => void) | undefined,
  onDuplicate: ((workspace: Workspace) => void) | undefined,
): WorkspaceActionAvailability {
  return {
    canEdit: onEdit !== undefined && role !== undefined && can(role, 'workspace:update'),
    canDelete: onRequestDelete !== undefined && role !== undefined && can(role, 'workspace:delete'),
    canDuplicate: onDuplicate !== undefined && role === 'owner',
  };
}

interface FavoriteButtonProps {
  readonly workspace: Workspace;
  readonly isFavorite: boolean;
  readonly isPending: boolean;
  readonly onToggleFavorite: (workspace: Workspace) => void;
}

function FavoriteButton({
  workspace,
  isFavorite,
  isPending,
  onToggleFavorite,
}: FavoriteButtonProps): ReactNode {
  const { t } = useI18n();
  const label = isFavorite
    ? t('workspaces.card.favorite.remove')
    : t('workspaces.card.favorite.add');

  return (
    <Tooltip content={label}>
      <NeutralIconButton
        type="button"
        variant="ghost"
        size="sm"
        label={`${label} ${workspace.name}`}
        aria-pressed={isFavorite}
        loading={isPending}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(workspace);
        }}
      >
        <Star aria-hidden="true" size={15} fill={isFavorite ? 'currentColor' : 'none'} />
      </NeutralIconButton>
    </Tooltip>
  );
}

interface WorkspaceIconActionsProps {
  readonly workspace: Workspace;
  readonly availability: WorkspaceActionAvailability;
  readonly isDuplicating: boolean;
  readonly onEdit?: (workspace: Workspace) => void;
  readonly onRequestDelete?: (workspace: Workspace) => void;
  readonly onDuplicate?: (workspace: Workspace) => void;
}

function WorkspaceIconActions({
  workspace,
  availability,
  isDuplicating,
  onEdit,
  onRequestDelete,
  onDuplicate,
}: WorkspaceIconActionsProps): ReactNode {
  const { t } = useI18n();

  if (!availability.canEdit && !availability.canDelete && !availability.canDuplicate) {
    return null;
  }

  return (
    <>
      {availability.canEdit && onEdit !== undefined && (
        <Tooltip content={t('workspaces.card.edit')}>
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={`${t('workspaces.card.edit')} ${workspace.name}`}
            onClick={() => onEdit(workspace)}
          >
            <Pencil aria-hidden="true" size={15} />
          </NeutralIconButton>
        </Tooltip>
      )}
      {availability.canDuplicate && onDuplicate !== undefined && (
        <Tooltip content={t('workspaces.card.duplicate')}>
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            loading={isDuplicating}
            label={`${t('workspaces.card.duplicate')} ${workspace.name}`}
            onClick={() => onDuplicate(workspace)}
          >
            <Copy aria-hidden="true" size={15} />
          </NeutralIconButton>
        </Tooltip>
      )}
      {availability.canDelete && onRequestDelete !== undefined && (
        <Tooltip content={t('workspaces.card.delete')}>
          <IconButton
            type="button"
            variant="destructive"
            size="sm"
            label={`${t('workspaces.card.delete')} ${workspace.name}`}
            onClick={() => onRequestDelete(workspace)}
          >
            <Trash2 aria-hidden="true" size={15} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}

export interface WorkspacesListEmptyState {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly illustration?: ReactNode;
}

export interface WorkspacesListProps {
  readonly status: 'idle' | 'loading' | 'success' | 'error';
  readonly workspaces: readonly Workspace[];
  readonly rolesByWorkspaceId: ReadonlyMap<string, MembershipRole>;
  readonly errorMessage?: string;
  readonly loadingLabel?: string;
  readonly emptyState?: WorkspacesListEmptyState;
  readonly onRetry: () => void;
  readonly onCreate: () => void;
  readonly onSelect?: (workspace: Workspace) => void;
  readonly onEdit?: (workspace: Workspace) => void;
  readonly onRequestDelete?: (workspace: Workspace) => void;
  readonly onDuplicate?: (workspace: Workspace) => void;
  readonly duplicatingWorkspaceId?: string | null;
  readonly favoriteWorkspaceIds?: ReadonlySet<string>;
  readonly pendingFavoriteWorkspaceIds?: ReadonlySet<string>;
  readonly onToggleFavorite?: (workspace: Workspace) => void;
}

export function WorkspacesList({
  status,
  workspaces,
  rolesByWorkspaceId,
  errorMessage,
  loadingLabel,
  emptyState,
  onRetry,
  onCreate,
  onSelect,
  onEdit,
  onRequestDelete,
  onDuplicate,
  duplicatingWorkspaceId,
  favoriteWorkspaceIds = EMPTY_WORKSPACE_IDS,
  pendingFavoriteWorkspaceIds = EMPTY_WORKSPACE_IDS,
  onToggleFavorite,
}: WorkspacesListProps): ReactNode {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('grid');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return workspaces;
    }
    return workspaces.filter((workspace) => {
      const description = workspace.description?.toLowerCase() ?? '';
      return workspace.name.toLowerCase().includes(normalized) || description.includes(normalized);
    });
  }, [query, workspaces]);

  if (status === 'loading' || status === 'idle') {
    return (
      <LoadingState label={loadingLabel ?? t('workspaces.loading')}>
        <ListGrid>
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={`workspace-skeleton-${index}`}>
              <Stack gap="space-3">
                <Skeleton data-testid="skeleton" style={{ height: '32px', width: '32px' }} />
                <Skeleton data-testid="skeleton" style={{ height: '20px', width: '70%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '16px', width: '50%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '16px', width: '40%' }} />
              </Stack>
            </Card>
          ))}
        </ListGrid>
      </LoadingState>
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <ErrorState
          title={t('workspaces.error.title')}
          description={errorMessage ?? t('workspaces.error.description')}
          actionLabel={t('common.retry')}
          onAction={onRetry}
        />
      </Card>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          title={emptyState?.title ?? t('workspaces.empty.title')}
          description={emptyState?.description ?? t('workspaces.empty.description')}
          actionLabel={emptyState?.actionLabel ?? t('workspaces.empty.action')}
          onAction={emptyState?.onAction ?? onCreate}
          illustration={
            emptyState?.illustration ?? <DecorativeSpark color="orange-500" size="lg" />
          }
          tone="brand"
          titleVariant="display"
        />
      </Card>
    );
  }

  const countLabel =
    filtered.length === 1
      ? t('workspaces.results.one')
      : t('workspaces.results.other', { count: filtered.length });

  return (
    <Stack gap="space-4">
      <SearchRow>
        <SearchControls>
          <SearchWrapper>
            <Search aria-hidden="true" size={16} />
            <Input
              type="search"
              aria-label={t('workspaces.searchLabel')}
              aria-describedby={RESULTS_COUNT_ID}
              placeholder={t('workspaces.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </SearchWrapper>
          <Text
            id={RESULTS_COUNT_ID}
            color="color.text.muted"
            size="font.size.sm"
            role="status"
            aria-live="polite"
          >
            {countLabel}
          </Text>
        </SearchControls>
        <WorkspaceViewToggle value={viewMode} onChange={setViewMode} />
      </SearchRow>

      {filtered.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title={t('workspaces.noResults.title')}
            description={t('workspaces.noResults.description')}
            actionLabel={t('workspaces.noResults.action')}
            onAction={() => setQuery('')}
            actionVariant="outline"
            illustration={<DecorativeArrow color="olive-500" size="lg" />}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <ListGrid data-testid="workspaces-grid">
          {filtered.map((workspace) => {
            const role = rolesByWorkspaceId.get(workspace.id.value);
            const availability = resolveWorkspaceActionAvailability(
              role,
              onEdit,
              onRequestDelete,
              onDuplicate,
            );
            const isDuplicating = duplicatingWorkspaceId === workspace.id.value;
            const hasActions =
              onSelect !== undefined ||
              onToggleFavorite !== undefined ||
              availability.canEdit ||
              availability.canDelete ||
              availability.canDuplicate;
            return (
              <Card
                key={workspace.id.value}
                as="article"
                interactive
                padding="none"
                style={{ overflow: 'hidden' }}
              >
                <CoverHeader data-testid="workspace-cover-card">
                  <WorkspaceCover url={workspace.coverImageUrl} iconSize={24} />
                </CoverHeader>
                <CardContent gap="space-4">
                  <Stack gap="space-3">
                    <CardHeading>
                      <Stack gap="space-1">
                        <CardTitle as="h3">{workspace.name}</CardTitle>
                        <Stack gap="space-1">
                          <Text color="color.text.muted" size="font.size.sm">
                            {t('workspaces.card.updated', {
                              when: formatRelativeDate(workspace.activityAt, locale),
                            })}
                          </Text>
                          <Text color="color.text.muted" size="font.size.sm">
                            {t('workspaces.card.created', {
                              when: formatShortDate(workspace.createdAt, locale),
                            })}
                          </Text>
                        </Stack>
                      </Stack>
                    </CardHeading>
                    <Description color="color.text.muted" size="font.size.sm">
                      {workspace.description ?? t('workspaces.card.noDescription')}
                    </Description>
                  </Stack>
                  {hasActions && (
                    <CardFooter>
                      {onSelect !== undefined && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelect(workspace)}
                        >
                          {t('common.open')}
                          <ArrowUpRight aria-hidden="true" size={14} />
                        </Button>
                      )}
                      <CardActions>
                        {onToggleFavorite !== undefined && (
                          <FavoriteButton
                            workspace={workspace}
                            isFavorite={favoriteWorkspaceIds.has(workspace.id.value)}
                            isPending={pendingFavoriteWorkspaceIds.has(workspace.id.value)}
                            onToggleFavorite={onToggleFavorite}
                          />
                        )}
                        <WorkspaceIconActions
                          workspace={workspace}
                          availability={availability}
                          isDuplicating={isDuplicating}
                          onEdit={onEdit}
                          onRequestDelete={onRequestDelete}
                          onDuplicate={onDuplicate}
                        />
                      </CardActions>
                    </CardFooter>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </ListGrid>
      ) : (
        <ListRows data-testid="workspaces-list">
          {filtered.map((workspace) => {
            const role = rolesByWorkspaceId.get(workspace.id.value);
            const availability = resolveWorkspaceActionAvailability(
              role,
              onEdit,
              onRequestDelete,
              onDuplicate,
            );
            const isDuplicating = duplicatingWorkspaceId === workspace.id.value;
            const hasActions =
              onSelect !== undefined ||
              onToggleFavorite !== undefined ||
              availability.canEdit ||
              availability.canDelete ||
              availability.canDuplicate;
            return (
              <Card key={workspace.id.value} as="li" padding="sm" interactive>
                <ListItemLayout>
                  <ListCover data-testid="workspace-cover-list">
                    <WorkspaceCover url={workspace.coverImageUrl} iconSize={20} />
                  </ListCover>
                  <Stack gap="space-2">
                    <ListTitle as="h3">{workspace.name}</ListTitle>
                    <Stack gap="space-1">
                      <Description color="color.text.muted" size="font.size.sm">
                        {workspace.description ?? t('workspaces.card.noDescription')}
                      </Description>
                      <ListMeta>
                        <Text color="color.text.muted" size="font.size.xs">
                          {t('workspaces.card.updated', {
                            when: formatRelativeDate(workspace.activityAt, locale),
                          })}
                        </Text>
                        <MetaDot aria-hidden="true">·</MetaDot>
                        <Text color="color.text.muted" size="font.size.xs">
                          {t('workspaces.card.created', {
                            when: formatShortDate(workspace.createdAt, locale),
                          })}
                        </Text>
                      </ListMeta>
                    </Stack>
                  </Stack>
                  {hasActions && (
                    <ListActions>
                      {onSelect !== undefined && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelect(workspace)}
                        >
                          {t('common.open')}
                          <ArrowUpRight aria-hidden="true" size={14} />
                        </Button>
                      )}
                      {onToggleFavorite !== undefined && (
                        <FavoriteButton
                          workspace={workspace}
                          isFavorite={favoriteWorkspaceIds.has(workspace.id.value)}
                          isPending={pendingFavoriteWorkspaceIds.has(workspace.id.value)}
                          onToggleFavorite={onToggleFavorite}
                        />
                      )}
                      <WorkspaceIconActions
                        workspace={workspace}
                        availability={availability}
                        isDuplicating={isDuplicating}
                        onEdit={onEdit}
                        onRequestDelete={onRequestDelete}
                        onDuplicate={onDuplicate}
                      />
                    </ListActions>
                  )}
                </ListItemLayout>
              </Card>
            );
          })}
        </ListRows>
      )}
    </Stack>
  );
}
