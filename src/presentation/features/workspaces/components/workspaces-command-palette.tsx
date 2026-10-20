import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import type { ListWorkspaces } from '../../../../application/queries';
import type { Workspace } from '../../../../domain/workspace';
import { CommandPalette } from '../../../components/command-palette';
import type { CommandPaletteGroup } from '../../../components/command-palette';
import { useWorkspaceSearch, searchWorkspacesByName } from '../../../hooks';
import { useI18n } from '../../../i18n';

export interface WorkspacesCommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly userId: string | undefined;
  readonly listWorkspaces: ListWorkspaces | undefined;
  readonly onCreateWorkspace: () => void;
  readonly onOpenWorkspace: (workspace: Workspace) => void;
}

export function WorkspacesCommandPalette({
  open,
  onOpenChange,
  userId,
  listWorkspaces,
  onCreateWorkspace,
  onOpenWorkspace,
}: WorkspacesCommandPaletteProps): ReactNode {
  const { t } = useI18n();
  const { workspaces, status } = useWorkspaceSearch({ enabled: open, userId, listWorkspaces });

  const groups = useMemo<readonly CommandPaletteGroup[]>(
    () => [
      {
        id: 'actions',
        label: t('commandPalette.group.actions'),
        items: [
          {
            id: 'create-workspace',
            label: t('workspaces.create'),
            onSelect: onCreateWorkspace,
          },
        ],
      },
    ],
    [onCreateWorkspace, t],
  );

  const searchGroups = useCallback(
    (query: string): readonly CommandPaletteGroup[] => {
      const matches = searchWorkspacesByName(workspaces, query);

      if (matches.length === 0) {
        return [];
      }

      return [
        {
          id: 'workspaces',
          label: t('commandPalette.group.workspaces'),
          items: matches.map((workspace) => ({
            id: `workspace-${workspace.id.value}`,
            label: workspace.name,
            description: workspace.description ?? undefined,
            onSelect: () => onOpenWorkspace(workspace),
          })),
        },
      ];
    },
    [onOpenWorkspace, t, workspaces],
  );

  const statusMessage =
    status === 'loading'
      ? t('commandPalette.workspacesLoading')
      : status === 'error'
        ? t('commandPalette.workspacesError')
        : null;

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      groups={groups}
      searchGroups={searchGroups}
      statusMessage={statusMessage}
    />
  );
}
