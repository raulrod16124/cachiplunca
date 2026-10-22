import type { ReactNode, RefObject } from 'react';
import { useCallback, useMemo } from 'react';
import type { ListWorkspaces } from '../../../../application/queries';
import { searchElements } from '../../../../application/services';
import { elementSearchText } from '../../../../application/services';
import type { Element, ElementType } from '../../../../domain/element';
import type { CanvasCommandHandle } from '../../../canvas';
import { CommandPalette } from '../../../components/command-palette';
import type { CommandPaletteGroup, CommandPaletteItem } from '../../../components/command-palette';
import { searchWorkspacesByName, useWorkspaceSearch } from '../../../hooks';
import { useI18n, type TranslationKey } from '../../../i18n';

const ELEMENT_TYPE_KEYS: Record<Exclude<ElementType, 'connector'>, TranslationKey> = {
  text: 'commandPalette.element.text',
  note: 'commandPalette.element.note',
  task: 'commandPalette.element.task',
  frame: 'commandPalette.element.frame',
  link: 'commandPalette.element.link',
  image: 'commandPalette.element.image',
};

const RESULT_TITLE_MAX_LENGTH = 80;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string): string {
  if (value.length <= RESULT_TITLE_MAX_LENGTH) {
    return value;
  }

  return `${value.slice(0, RESULT_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

export interface WorkspaceCommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspaceId: string;
  readonly elements: readonly Element[];
  readonly commandRef: RefObject<CanvasCommandHandle | null>;
  readonly canCreate: boolean;
  readonly canCreateFreeConnector: boolean;
  readonly canConnectSelected: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onShare?: () => void;
  readonly onShowShortcuts?: () => void;
  readonly onBack: () => void;
  readonly userId: string | undefined;
  readonly listWorkspaces: ListWorkspaces | undefined;
  readonly onOpenWorkspace?: (workspaceId: string) => void;
}

export function WorkspaceCommandPalette({
  open,
  onOpenChange,
  workspaceId,
  elements,
  commandRef,
  canCreate,
  canCreateFreeConnector,
  canConnectSelected,
  canUndo,
  canRedo,
  onShare,
  onShowShortcuts,
  onBack,
  userId,
  listWorkspaces,
  onOpenWorkspace,
}: WorkspaceCommandPaletteProps): ReactNode {
  const { t } = useI18n();
  const { workspaces, status } = useWorkspaceSearch({ enabled: open, userId, listWorkspaces });

  const groups = useMemo<readonly CommandPaletteGroup[]>(() => {
    const createItems: CommandPaletteItem[] = canCreate
      ? (
          [
            ['text', t('canvas.toolbar.addText')],
            ['note', t('canvas.toolbar.addNote')],
            ['task', t('canvas.toolbar.addTask')],
            ['frame', t('canvas.toolbar.addFrame')],
            ['link', t('canvas.toolbar.addLink')],
            ['image', t('canvas.toolbar.addImage')],
          ] as const
        ).map(([type, label]) => ({
          id: `create-${type}`,
          label,
          keywords: `create add ${type}`,
          onSelect: () => commandRef.current?.createElement(type),
        }))
      : [];

    const connectorItems: CommandPaletteItem[] = [];

    if (canCreateFreeConnector) {
      connectorItems.push({
        id: 'create-connector-free',
        label: t('canvas.toolbar.addConnector'),
        keywords: 'create add connector free',
        onSelect: () => commandRef.current?.createConnector('free'),
      });
    }

    if (canConnectSelected) {
      connectorItems.push({
        id: 'create-connector-bound',
        label: t('canvas.toolbar.connectSelected'),
        keywords: 'create add connector selected',
        onSelect: () => commandRef.current?.createConnector('bound'),
      });
    }

    const navigationItems: CommandPaletteItem[] = [
      {
        id: 'fit-view',
        label: t('canvas.toolbar.fitView'),
        keywords: 'fit zoom view',
        onSelect: () => commandRef.current?.fitView(),
      },
      {
        id: 'undo',
        label: t('shortcuts.selection.undo'),
        shortcut: t('shortcuts.keys.undo'),
        disabled: !canUndo,
        keywords: 'history back',
        onSelect: () => commandRef.current?.undo(),
      },
      {
        id: 'redo',
        label: t('shortcuts.selection.redo'),
        shortcut: t('shortcuts.keys.redo'),
        disabled: !canRedo,
        keywords: 'history forward',
        onSelect: () => commandRef.current?.redo(),
      },
    ];

    if (onShare !== undefined) {
      navigationItems.push({
        id: 'share',
        label: t('canvas.topbar.share'),
        keywords: 'members invite permissions',
        onSelect: onShare,
      });
    }

    if (onShowShortcuts !== undefined) {
      navigationItems.push({
        id: 'keyboard-shortcuts',
        label: t('shortcuts.open'),
        shortcut: '?',
        keywords: 'help keys',
        onSelect: onShowShortcuts,
      });
    }

    navigationItems.push({
      id: 'back-to-workspaces',
      label: t('canvas.topbar.back'),
      keywords: 'leave exit boards',
      onSelect: onBack,
    });

    return [
      {
        id: 'create',
        label: t('commandPalette.group.actions'),
        items: [...createItems, ...connectorItems],
      },
      {
        id: 'navigate',
        label: t('commandPalette.group.navigation'),
        items: navigationItems,
      },
    ].filter((group) => group.items.length > 0);
  }, [
    canConnectSelected,
    canCreate,
    canCreateFreeConnector,
    canRedo,
    canUndo,
    commandRef,
    onBack,
    onShare,
    onShowShortcuts,
    t,
  ]);

  const searchGroups = useCallback(
    (query: string): readonly CommandPaletteGroup[] => {
      const resultGroups: CommandPaletteGroup[] = [];
      const matchedWorkspaces =
        onOpenWorkspace === undefined
          ? []
          : searchWorkspacesByName(workspaces, query).filter(
              (workspace) => workspace.id.value !== workspaceId,
            );

      if (matchedWorkspaces.length > 0 && onOpenWorkspace !== undefined) {
        resultGroups.push({
          id: 'workspaces',
          label: t('commandPalette.group.workspaces'),
          items: matchedWorkspaces.map((workspace) => ({
            id: `workspace-${workspace.id.value}`,
            label: workspace.name,
            description: workspace.description ?? undefined,
            onSelect: () => onOpenWorkspace(workspace.id.value),
          })),
        });
      }

      const matchedElements = searchElements(elements, query);

      if (matchedElements.length > 0) {
        resultGroups.push({
          id: 'elements',
          label: t('commandPalette.group.elements'),
          items: matchedElements.map((element) => {
            const searchText = elementSearchText(element);
            const type =
              element.type === 'connector' ? element.type : t(ELEMENT_TYPE_KEYS[element.type]);
            const text = truncate(collapseWhitespace(searchText));

            return {
              id: `element-${element.id.value}`,
              label:
                text.length === 0 ? t('commandPalette.elementEmpty', { type }) : `${type}: ${text}`,
              keywords: searchText,
              onSelect: () => commandRef.current?.focusElement(element.id.value),
            };
          }),
        });
      }

      return resultGroups;
    },
    [commandRef, elements, onOpenWorkspace, t, workspaceId, workspaces],
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
