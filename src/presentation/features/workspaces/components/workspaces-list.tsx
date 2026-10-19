import { Button, Heading, Input, Skeleton, Stack, Text } from '@raulrod/ui';
import { ArrowUpRight, LayoutGrid, Search, Trash2 } from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { can } from '../../../../domain/membership';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { formatRelativeDate, useI18n } from '../../../i18n';

const ListGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
`;

const CardShell = styled.div`
  background: ${({ theme }) => theme.color.background.surface};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.space[4]};
  display: flex;
  flex-direction: column;
  transition:
    border-color ${({ theme }) => theme.motion.duration.fast} ease,
    box-shadow ${({ theme }) => theme.motion.duration.fast} ease,
    transform ${({ theme }) => theme.motion.duration.fast} ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.border.strong};
    box-shadow: ${({ theme }) => theme.shadow.sm};
    transform: translateY(-1px);
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
  readonly onRequestDelete?: (workspace: Workspace) => void;
}

export function WorkspacesList({
  status,
  workspaces,
  rolesByWorkspaceId,
  errorMessage,
  onRetry,
  onCreate,
  onSelect,
  onRequestDelete,
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
      <LoadingState label="Loading workspaces">
        <ListGrid>
          {Array.from({ length: 6 }).map((_, index) => (
            <CardShell key={`workspace-skeleton-${index}`}>
              <Stack gap="space-3">
                <Skeleton data-testid="skeleton" style={{ height: '32px', width: '32px' }} />
                <Skeleton data-testid="skeleton" style={{ height: '20px', width: '70%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '16px', width: '50%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '16px', width: '40%' }} />
              </Stack>
            </CardShell>
          ))}
        </ListGrid>
      </LoadingState>
    );
  }

  if (status === 'error') {
    return (
      <CardShell>
        <ErrorState
          title={t('workspaces.error.title')}
          description={errorMessage ?? t('workspaces.error.description')}
          actionLabel={t('common.retry')}
          onAction={onRetry}
        />
      </CardShell>
    );
  }

  if (workspaces.length === 0) {
    return (
      <CardShell>
        <EmptyState
          title={t('workspaces.empty.title')}
          description={t('workspaces.empty.description')}
          actionLabel={t('workspaces.empty.action')}
          onAction={onCreate}
        />
      </CardShell>
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
            placeholder={t('workspaces.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </SearchWrapper>
        <Text color="color.text.muted" size="font.size.sm" role="status" aria-live="polite">
          {countLabel}
        </Text>
      </SearchRow>

      {filtered.length === 0 ? (
        <CardShell>
          <EmptyState
            title={t('workspaces.noResults.title')}
            description={t('workspaces.noResults.description')}
            actionLabel={t('workspaces.noResults.action')}
            onAction={() => setQuery('')}
          />
        </CardShell>
      ) : (
        <ListGrid>
          {filtered.map((workspace) => {
            const role = rolesByWorkspaceId.get(workspace.id.value);
            const canDelete =
              onRequestDelete !== undefined && role !== undefined && can(role, 'workspace:delete');

            return (
              <CardShell key={workspace.id.value} as="article">
                <CardContent gap="space-4">
                  <Stack gap="space-3">
                    <CardHeading>
                      <CardIcon aria-hidden="true">
                        <LayoutGrid size={16} />
                      </CardIcon>
                      <Stack gap="space-1">
                        <Heading as="h3">{workspace.name}</Heading>
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
                  {(onSelect !== undefined || canDelete) && (
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
                      {canDelete && onRequestDelete !== undefined && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          aria-label={`${t('workspaces.card.delete')} ${workspace.name}`}
                          onClick={() => onRequestDelete(workspace)}
                        >
                          <Trash2 aria-hidden="true" size={14} />
                          {t('workspaces.card.delete')}
                        </Button>
                      )}
                    </CardFooter>
                  )}
                </CardContent>
              </CardShell>
            );
          })}
        </ListGrid>
      )}
    </Stack>
  );
}
