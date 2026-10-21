import { Button, Heading, IconButton, Input, Skeleton, Stack, Text, Tooltip } from '@raulrod/ui';
import { ArrowUpRight, Copy, LayoutGrid, Pencil, Search, Trash2 } from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { can } from '../../../../domain/membership';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { Card } from '../../../components/card';
import { NeutralIconButton } from '../../../components/neutral-controls';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { DecorativeArrow, DecorativeSpark } from '../../../components/decorative';
import { formatRelativeDate, useI18n } from '../../../i18n';

const RESULTS_COUNT_ID = 'workspaces-results-count';

const ListGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const CardContent = styled(Stack)`
  height: 100%;
  justify-content: space-between;
`;

const CardIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.muted};
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

export interface WorkspacesListProps {
  readonly status: 'idle' | 'loading' | 'success' | 'error';
  readonly workspaces: readonly Workspace[];
  readonly rolesByWorkspaceId: ReadonlyMap<string, MembershipRole>;
  readonly errorMessage?: string;
  readonly onRetry: () => void;
  readonly onCreate: () => void;
  readonly onSelect?: (workspace: Workspace) => void;
  readonly onEdit?: (workspace: Workspace) => void;
  readonly onRequestDelete?: (workspace: Workspace) => void;
  readonly onDuplicate?: (workspace: Workspace) => void;
  readonly duplicatingWorkspaceId?: string | null;
}

export function WorkspacesList({
  status,
  workspaces,
  rolesByWorkspaceId,
  errorMessage,
  onRetry,
  onCreate,
  onSelect,
  onEdit,
  onRequestDelete,
  onDuplicate,
  duplicatingWorkspaceId,
}: WorkspacesListProps): ReactNode {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');

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
      <LoadingState label={t('workspaces.loading')}>
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
          title={t('workspaces.empty.title')}
          description={t('workspaces.empty.description')}
          actionLabel={t('workspaces.empty.action')}
          onAction={onCreate}
          illustration={<DecorativeSpark color="orange-500" size="lg" />}
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
      ) : (
        <ListGrid>
          {filtered.map((workspace) => {
            const role = rolesByWorkspaceId.get(workspace.id.value);
            const canEdit =
              onEdit !== undefined && role !== undefined && can(role, 'workspace:update');
            const canDelete =
              onRequestDelete !== undefined && role !== undefined && can(role, 'workspace:delete');
            const canDuplicate = onDuplicate !== undefined && role === 'owner';
            const isDuplicating = duplicatingWorkspaceId === workspace.id.value;
            const hasActions = onSelect !== undefined || canEdit || canDelete || canDuplicate;

            return (
              <Card key={workspace.id.value} as="article" interactive>
                <CardContent gap="space-4">
                  <Stack gap="space-3">
                    <CardHeading>
                      <CardIcon aria-hidden="true">
                        <LayoutGrid size={16} />
                      </CardIcon>
                      <Stack gap="space-1">
                        <CardTitle as="h3">{workspace.name}</CardTitle>
                        <Text color="color.text.muted" size="font.size.sm">
                          {t('workspaces.card.updated', {
                            when: formatRelativeDate(workspace.updatedAt, locale),
                          })}
                        </Text>
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
                        {canEdit && onEdit !== undefined && (
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
                        {canDuplicate && onDuplicate !== undefined && (
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
                        {canDelete && onRequestDelete !== undefined && (
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
                      </CardActions>
                    </CardFooter>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </ListGrid>
      )}
    </Stack>
  );
}
