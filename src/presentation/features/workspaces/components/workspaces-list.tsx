import { Button, Heading, IconButton, Input, Skeleton, Stack, Text, Tooltip } from '@raulrod/ui';
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Copy,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Shapes,
  Star,
  Trash2,
} from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { can } from '../../../../domain/membership';
import type { MembershipRole } from '../../../../domain/membership';
import type { Workspace } from '../../../../domain/workspace';
import { NeutralIconButton } from '../../../components/neutral-controls';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { DecorativeArrow, DecorativeSpark } from '../../../components/decorative';
import { formatRelativeDate, formatShortDate, useI18n } from '../../../i18n';
import { WorkspaceViewToggle, type WorkspaceViewMode } from './workspace-view-toggle';

const RESULTS_COUNT_ID = 'workspaces-results-count';
const EMPTY_WORKSPACE_IDS: ReadonlySet<string> = new Set();

type CoverTone = 'warm' | 'green' | 'amber';

const COVER_TONES: readonly CoverTone[] = ['warm', 'green', 'amber'];

function coverToneFor(workspaceName: string): CoverTone {
  let hash = 0;
  for (let index = 0; index < workspaceName.length; index += 1) {
    hash = (hash + workspaceName.charCodeAt(index)) % COVER_TONES.length;
  }
  return COVER_TONES[hash] ?? 'warm';
}

function coverGradient(tone: CoverTone): string {
  return `linear-gradient(135deg, var(--stitch-cover-${tone}-from), var(--stitch-cover-${tone}-via), var(--stitch-cover-${tone}-to))`;
}

function coverBorder(tone: CoverTone): string {
  return `var(--stitch-cover-${tone}-border)`;
}

function coverDot(tone: CoverTone): string {
  return `var(--stitch-cover-${tone}-dot)`;
}

function coverIcon(tone: CoverTone): ReactNode {
  if (tone === 'green') {
    return <CalendarDays aria-hidden="true" size={26} />;
  }
  if (tone === 'amber') {
    return <Shapes aria-hidden="true" size={26} />;
  }
  return <LayoutGrid aria-hidden="true" size={26} />;
}

const ListGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const BoardCard = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--stitch-border);
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-surface);
  color: var(--stitch-text);
  box-shadow: var(--stitch-card-shadow);
  transition:
    border-color 300ms ease,
    box-shadow 300ms ease,
    transform 300ms ease;

  &:hover {
    border-color: var(--stitch-card-border-hover);
    box-shadow: var(--stitch-card-shadow-hover);
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;

const Cover = styled.div<{ $tone: CoverTone; $hasCover: boolean }>`
  position: relative;
  height: 130px;
  overflow: hidden;
  border-bottom: 1px solid ${({ $tone }) => coverBorder($tone)};
  background: ${({ $tone }) => coverGradient($tone)};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    background-image: radial-gradient(${({ $tone }) => coverDot($tone)} 1px, transparent 0);
    background-size: 16px 16px;
    mix-blend-mode: multiply;
    opacity: ${({ $hasCover }) => ($hasCover ? 0 : 0.4)};
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -48px;
    left: -48px;
    width: 160px;
    height: 160px;
    border-radius: 999px;
    background: ${({ $tone }) => `color-mix(in srgb, ${coverDot($tone)} 20%, transparent)`};
    filter: blur(32px);
    pointer-events: none;
  }

  [data-theme='dark'] &::before {
    mix-blend-mode: screen;
    opacity: ${({ $hasCover }) => ($hasCover ? 0 : 0.25)};
  }
`;

const CoverFrame = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: color-mix(in srgb, var(--stitch-cover-warm-dot) 60%, var(--stitch-text));
`;

const CoverImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FavoriteSlot = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[3]};
  right: ${({ theme }) => theme.space[3]};
  z-index: 3;
`;

const FavoriteIcon = styled(NeutralIconButton)`
  &.rr-icon-button {
    width: 36px;
    height: 36px;
    border: 1px solid color-mix(in srgb, var(--stitch-surface) 60%, transparent);
    border-radius: ${({ theme }) => theme.radius.full};
    background: color-mix(in srgb, var(--stitch-surface) 80%, transparent);
    color: var(--stitch-favorite-ink);
    box-shadow: ${({ theme }) => theme.shadow.sm};
    backdrop-filter: blur(8px);
  }

  &.rr-icon-button:hover:not(:disabled) {
    background: var(--stitch-surface);
    color: var(--stitch-favorite-ink);
    transform: scale(1.08);
  }

  &.rr-icon-button:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const BadgeRow = styled.div`
  position: relative;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: 0 ${({ theme }) => theme.space[6]};
  margin-top: -28px;
  pointer-events: none;
`;

const IconBadge = styled.div<{ $tone: CoverTone }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 56px;
  height: 56px;
  padding: 2px;
  border: 2px solid var(--stitch-surface);
  border-radius: var(--stitch-radius-icon);
  background: ${({ $tone }) =>
    $tone === 'warm'
      ? 'linear-gradient(135deg, var(--stitch-badge-warm-from), var(--stitch-badge-warm-to))'
      : $tone === 'green'
        ? 'linear-gradient(135deg, var(--stitch-badge-green-from), var(--stitch-badge-green-to))'
        : 'linear-gradient(135deg, var(--stitch-badge-amber-from), var(--stitch-badge-amber-to))'};
  color: var(--stitch-badge-text);
  box-shadow: var(--stitch-badge-shadow);
  pointer-events: auto;
  transition: transform 300ms ease;

  ${BoardCard}:hover & {
    transform: scale(1.05);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const IconBadgeInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--stitch-radius-icon) - 3px);
  background: color-mix(in srgb, var(--stitch-surface) 12%, transparent);
`;

const RoleChip = styled.span`
  flex: none;
  padding: 2px 10px;
  border: 1px solid color-mix(in srgb, var(--stitch-secondary) 30%, transparent);
  border-radius: ${({ theme }) => theme.radius.full};
  background: color-mix(in srgb, var(--stitch-secondary) 12%, transparent);
  color: var(--stitch-secondary);
  font-size: ${({ theme }) => theme.font.size['2xs']};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const CardContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[6]} 0`};
`;

const CardTitle = styled(Heading)`
  margin: 0;
  color: var(--stitch-text);
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  letter-spacing: -0.015em;
  line-height: ${({ theme }) => theme.font.leading.tight};
  overflow-wrap: anywhere;
  transition: color 300ms ease;

  ${BoardCard}:hover & {
    color: var(--stitch-secondary);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Description = styled(Text)`
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid var(--stitch-border-soft);
  color: var(--stitch-text-subtle);
  font-size: 11px;
`;

const MetaItem = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: ${({ $accent }) => ($accent ? 'var(--stitch-secondary)' : 'var(--stitch-text-muted)')};
  font-weight: ${({ theme, $accent }) =>
    $accent ? theme.font.weight.medium : theme.font.weight.regular};
  white-space: nowrap;

  svg {
    flex: none;
    color: ${({ $accent }) => ($accent ? 'var(--stitch-secondary)' : 'var(--stitch-text-subtle)')};
  }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[6]} ${theme.space[5]}`};
`;

const OpenButton = styled(Button)`
  &&.rr-button.rr-button--primary {
    flex: 1 1 auto;
    min-width: 0;
    height: 40px;
    padding: 0 ${({ theme }) => theme.space[3]};
    border-color: var(--stitch-open-border);
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-open-bg);
    color: var(--stitch-open-text);
    font-size: ${({ theme }) => theme.font.size['2xs']};
    font-weight: ${({ theme }) => theme.font.weight.semibold};
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  &&.rr-button.rr-button--primary:hover {
    background: var(--stitch-open-hover);
  }

  &&.rr-button.rr-button--primary:active {
    transform: scale(0.98);
  }

  &&.rr-button.rr-button--primary svg {
    color: var(--stitch-open-icon);
  }
`;

const SquareButton = styled(NeutralIconButton)`
  &.rr-icon-button {
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--stitch-action-border);
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-action-bg);
    color: var(--stitch-action-text);
  }

  &.rr-icon-button:hover:not(:disabled) {
    background: var(--stitch-action-hover);
    color: var(--stitch-text);
  }

  &.rr-icon-button:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const DeleteButton = styled(IconButton)`
  &.rr-icon-button {
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--stitch-error-border);
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-error-soft);
    color: var(--stitch-error);
  }

  &.rr-icon-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--stitch-error) 24%, transparent);
    color: var(--stitch-error-hover);
  }

  &.rr-icon-button:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const SearchControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1 1 320px;
  flex-wrap: wrap;
  min-width: 0;
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  flex: 1 1 320px;
  align-items: center;
  max-width: 640px;

  & > svg {
    position: absolute;
    top: 50%;
    left: ${({ theme }) => theme.space[4]};
    z-index: 1;
    color: var(--stitch-text-subtle);
    transform: translateY(-50%);
    pointer-events: none;
  }
`;

const SearchInput = styled(Input)`
  &&.rr-input {
    height: 44px;
    padding-left: 44px;
    padding-right: 64px;
    border: 1px solid var(--stitch-border);
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-input-bg);
    color: var(--stitch-text);
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  &&.rr-input::placeholder {
    color: var(--stitch-input-placeholder);
  }

  &&.rr-input:focus-visible {
    border-color: color-mix(in srgb, var(--stitch-primary) 50%, transparent);
    outline: 2px solid color-mix(in srgb, var(--stitch-primary) 30%, transparent);
    outline-offset: 1px;
  }
`;

const ShortcutHint = styled.button`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.space[3]};
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--stitch-kbd-border);
  border-radius: 6px;
  background: var(--stitch-kbd-bg);
  color: var(--stitch-kbd-text);
  font-family: var(--stitch-font-mono);
  font-size: 12px;
  line-height: 16px;
  cursor: pointer;
  transform: translateY(-50%);
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--rr-color-focus-ring);
    outline-offset: 2px;
  }
`;

const ResultsCount = styled(Text)`
  flex: none;
  color: var(--stitch-text-muted);
`;

const ListRows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
`;

const ListRow = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  min-width: 0;
  padding: ${({ theme }) => theme.space[3]};
  border: 1px solid var(--stitch-border);
  border-radius: 20px;
  background: var(--stitch-surface);
  color: var(--stitch-text);
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;

  &:hover {
    border-color: var(--stitch-card-border-hover);
    box-shadow: var(--stitch-card-shadow);
  }

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
  border: 1px solid var(--stitch-border);
  border-radius: ${({ theme }) => theme.radius.md};
  background: var(--stitch-surface-low);
`;

const ListCoverLetter = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--stitch-secondary);
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  text-transform: uppercase;
`;

const ListMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

const ListTitle = styled(CardTitle)`
  font-size: ${({ theme }) => theme.font.size.base};
`;

const ListMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
  color: var(--stitch-text-subtle);
  font-size: ${({ theme }) => theme.font.size.xs};
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

const MetaDot = styled.span`
  color: var(--stitch-text-subtle);
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1;
`;

const StateSurface = styled.section`
  padding: ${({ theme }) => theme.space[8]};
  border: 1px solid var(--stitch-border);
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-surface);
  color: var(--stitch-text);
  box-shadow: var(--stitch-card-shadow);
`;

const CreateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  padding: ${({ theme }) => theme.space[6]};
  border: 2px dashed var(--stitch-new-border);
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-new-bg);
  color: var(--stitch-text);
  text-align: center;
  transition:
    border-color 300ms ease,
    background 300ms ease,
    box-shadow 300ms ease;

  &:hover {
    border-color: var(--stitch-new-border-hover);
    background: var(--stitch-new-hover);
    box-shadow: var(--stitch-new-shadow-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CreateIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  border: 1px solid var(--stitch-new-icon-border);
  border-radius: 22px;
  background: linear-gradient(135deg, var(--stitch-new-icon-from), var(--stitch-new-icon-to));
  color: var(--stitch-new-icon-text);
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition:
    background 300ms ease,
    color 300ms ease,
    transform 300ms ease;

  ${CreateCard}:hover & {
    background: var(--stitch-new-icon-hover-bg);
    color: var(--stitch-new-icon-hover-text);
    transform: scale(1.1);
  }
`;

const CreateTitle = styled.h2`
  margin: 0 0 6px;
  color: var(--stitch-text);
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  letter-spacing: -0.01em;
  line-height: ${({ theme }) => theme.font.leading.tight};
  transition: color 300ms ease;

  ${CreateCard}:hover & {
    color: var(--stitch-secondary);
  }
`;

const CreateDescription = styled.p`
  max-width: 220px;
  margin: 0 0 ${({ theme }) => theme.space[4]};
  color: var(--stitch-text-muted);
  font-size: ${({ theme }) => theme.font.size['2xs']};
  line-height: 1.6;
`;

const CreateButton = styled(Button)`
  &&.rr-button.rr-button--primary {
    height: auto;
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-new-button-bg);
    color: var(--stitch-new-button-text);
    font-size: ${({ theme }) => theme.font.size['2xs']};
    font-weight: ${({ theme }) => theme.font.weight.semibold};
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  &&.rr-button.rr-button--primary:hover {
    background: var(--stitch-new-button-hover-bg);
    color: var(--stitch-new-button-hover-text);
  }
`;

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 330px;
  overflow: hidden;
  border: 1px solid var(--stitch-border);
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-surface);
  box-shadow: var(--stitch-card-shadow);
`;

const SkeletonCover = styled.div`
  height: 130px;
  background: var(--stitch-surface-high);
`;

const SkeletonBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[6]};
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
      <FavoriteIcon
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
        <Star aria-hidden="true" size={17} fill={isFavorite ? 'currentColor' : 'none'} />
      </FavoriteIcon>
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
          <SquareButton
            type="button"
            variant="ghost"
            size="sm"
            label={`${t('workspaces.card.edit')} ${workspace.name}`}
            onClick={() => onEdit(workspace)}
          >
            <Pencil aria-hidden="true" size={15} />
          </SquareButton>
        </Tooltip>
      )}
      {availability.canDuplicate && onDuplicate !== undefined && (
        <Tooltip content={t('workspaces.card.duplicate')}>
          <SquareButton
            type="button"
            variant="ghost"
            size="sm"
            loading={isDuplicating}
            label={`${t('workspaces.card.duplicate')} ${workspace.name}`}
            onClick={() => onDuplicate(workspace)}
          >
            <Copy aria-hidden="true" size={15} />
          </SquareButton>
        </Tooltip>
      )}
      {availability.canDelete && onRequestDelete !== undefined && (
        <Tooltip content={t('workspaces.card.delete')}>
          <DeleteButton
            type="button"
            variant="destructive"
            size="sm"
            label={`${t('workspaces.card.delete')} ${workspace.name}`}
            onClick={() => onRequestDelete(workspace)}
          >
            <Trash2 aria-hidden="true" size={15} />
          </DeleteButton>
        </Tooltip>
      )}
    </>
  );
}

function RoleChipLabel({ role }: { readonly role: MembershipRole | undefined }): ReactNode {
  const { t } = useI18n();

  if (role === undefined) {
    return null;
  }

  const label =
    role === 'owner'
      ? t('share.role.owner')
      : role === 'editor'
        ? t('share.role.editor')
        : t('share.role.viewer');

  return <RoleChip>{label}</RoleChip>;
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
  readonly onCreateCard?: boolean;
  readonly onOpenCommandPalette?: () => void;
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
  onCreateCard = true,
  onOpenCommandPalette,
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
            <SkeletonCard key={`workspace-skeleton-${index}`}>
              <SkeletonCover />
              <SkeletonBody>
                <Skeleton data-testid="skeleton" style={{ height: '24px', width: '70%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '14px', width: '90%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '14px', width: '60%' }} />
                <Skeleton data-testid="skeleton" style={{ height: '40px', width: '100%' }} />
              </SkeletonBody>
            </SkeletonCard>
          ))}
        </ListGrid>
      </LoadingState>
    );
  }

  if (status === 'error') {
    return (
      <StateSurface>
        <ErrorState
          title={t('workspaces.error.title')}
          description={errorMessage ?? t('workspaces.error.description')}
          actionLabel={t('common.retry')}
          onAction={onRetry}
        />
      </StateSurface>
    );
  }

  if (workspaces.length === 0) {
    return (
      <StateSurface>
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
      </StateSurface>
    );
  }

  const countLabel =
    filtered.length === 1
      ? t('workspaces.results.one')
      : t('workspaces.results.other', { count: filtered.length });

  const createCard =
    onCreateCard && filtered.length > 0 ? (
      <CreateCard>
        <CreateIcon>
          <Plus aria-hidden="true" size={30} />
        </CreateIcon>
        <CreateTitle>{t('workspaces.createCard.title')}</CreateTitle>
        <CreateDescription>{t('workspaces.createCard.description')}</CreateDescription>
        <CreateButton type="button" variant="primary" onClick={onCreate}>
          {t('workspaces.createCard.action')}
          <ArrowUpRight aria-hidden="true" size={14} />
        </CreateButton>
      </CreateCard>
    ) : null;

  return (
    <Stack gap="space-4">
      <SearchRow>
        <SearchControls>
          <SearchWrapper>
            <Search aria-hidden="true" size={18} />
            <SearchInput
              type="search"
              aria-label={t('workspaces.searchLabel')}
              aria-describedby={RESULTS_COUNT_ID}
              placeholder={t('workspaces.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {onOpenCommandPalette === undefined ? (
              <ShortcutHint as="span">⌘K</ShortcutHint>
            ) : (
              <ShortcutHint
                type="button"
                aria-label={t('workspaces.searchShortcut')}
                onClick={onOpenCommandPalette}
              >
                ⌘K
              </ShortcutHint>
            )}
          </SearchWrapper>
          <ResultsCount id={RESULTS_COUNT_ID} role="status" aria-live="polite" size="font.size.sm">
            {countLabel}
          </ResultsCount>
        </SearchControls>
        <WorkspaceViewToggle value={viewMode} onChange={setViewMode} />
      </SearchRow>

      {filtered.length === 0 ? (
        <StateSurface>
          <EmptyState
            title={t('workspaces.noResults.title')}
            description={t('workspaces.noResults.description')}
            actionLabel={t('workspaces.noResults.action')}
            onAction={() => setQuery('')}
            actionVariant="outline"
            illustration={<DecorativeArrow color="olive-500" size="lg" />}
          />
        </StateSurface>
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
            const tone = coverToneFor(workspace.name);
            return (
              <BoardCard key={workspace.id.value}>
                <div>
                  <Cover $tone={tone} $hasCover={workspace.coverImageUrl !== null}>
                    <CoverFrame data-testid="workspace-cover-card">
                      {workspace.coverImageUrl === null ? (
                        coverIcon(tone)
                      ) : (
                        <CoverImage src={workspace.coverImageUrl} alt="" loading="lazy" />
                      )}
                    </CoverFrame>
                    {onToggleFavorite !== undefined && (
                      <FavoriteSlot>
                        <FavoriteButton
                          workspace={workspace}
                          isFavorite={favoriteWorkspaceIds.has(workspace.id.value)}
                          isPending={pendingFavoriteWorkspaceIds.has(workspace.id.value)}
                          onToggleFavorite={onToggleFavorite}
                        />
                      </FavoriteSlot>
                    )}
                  </Cover>
                  <BadgeRow>
                    <IconBadge $tone={tone}>
                      <IconBadgeInner>{coverIcon(tone)}</IconBadgeInner>
                    </IconBadge>
                    <RoleChipLabel role={role} />
                  </BadgeRow>
                  <CardContent>
                    <Stack gap="space-2">
                      <CardTitle as="h3">{workspace.name}</CardTitle>
                      <Description color="color.text.muted" size="font.size.sm">
                        {workspace.description ?? t('workspaces.card.noDescription')}
                      </Description>
                    </Stack>
                    <MetaRow>
                      <MetaItem $accent>
                        <Clock aria-hidden="true" size={14} />
                        <span>
                          {t('workspaces.card.updated', {
                            when: formatRelativeDate(workspace.activityAt, locale),
                          })}
                        </span>
                      </MetaItem>
                      <MetaItem>
                        <CalendarDays aria-hidden="true" size={14} />
                        <span>
                          {t('workspaces.card.created', {
                            when: formatShortDate(workspace.createdAt, locale),
                          })}
                        </span>
                      </MetaItem>
                    </MetaRow>
                  </CardContent>
                </div>
                <CardActions>
                  {onSelect !== undefined && (
                    <OpenButton type="button" variant="primary" onClick={() => onSelect(workspace)}>
                      {t('common.open')}
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </OpenButton>
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
              </BoardCard>
            );
          })}
          {createCard}
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
            return (
              <ListRow key={workspace.id.value}>
                <ListCover data-testid="workspace-cover-list">
                  {workspace.coverImageUrl === null ? (
                    <ListCoverLetter>{workspace.name.charAt(0)}</ListCoverLetter>
                  ) : (
                    <CoverImage src={workspace.coverImageUrl} alt="" loading="lazy" />
                  )}
                </ListCover>
                <ListMain>
                  <ListTitle as="h3">{workspace.name}</ListTitle>
                  <Description color="color.text.muted" size="font.size.sm">
                    {workspace.description ?? t('workspaces.card.noDescription')}
                  </Description>
                  <ListMeta>
                    <MetaItem $accent>
                      <Clock aria-hidden="true" size={13} />
                      {t('workspaces.card.updated', {
                        when: formatRelativeDate(workspace.activityAt, locale),
                      })}
                    </MetaItem>
                    <MetaDot aria-hidden="true">·</MetaDot>
                    <MetaItem>
                      <CalendarDays aria-hidden="true" size={13} />
                      {t('workspaces.card.created', {
                        when: formatShortDate(workspace.createdAt, locale),
                      })}
                    </MetaItem>
                    {role === undefined ? null : (
                      <>
                        <MetaDot aria-hidden="true">·</MetaDot>
                        <RoleChipLabel role={role} />
                      </>
                    )}
                  </ListMeta>
                </ListMain>
                <ListActions>
                  {onSelect !== undefined && (
                    <OpenButton type="button" variant="primary" onClick={() => onSelect(workspace)}>
                      {t('common.open')}
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </OpenButton>
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
              </ListRow>
            );
          })}
        </ListRows>
      )}
    </Stack>
  );
}
