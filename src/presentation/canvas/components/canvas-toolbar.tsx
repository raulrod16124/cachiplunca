import { Tooltip } from '@raulrod/ui';
import {
  ArrowUpRight,
  Frame,
  Link2,
  Scan,
  SquareCheck,
  StickyNote,
  Trash2,
  Type,
  Waypoints,
} from '@raulrod/icons';
import type { ReactElement, ReactNode } from 'react';
import styled from 'styled-components';
import type { ElementType } from '../../../domain/element';
import { ToolbarButton } from '../../components';
import { useRovingFocus } from '../../hooks';
import { useI18n, type TranslationKey } from '../../i18n';

const ICON_SIZE = 16;

const Bar = styled.div`
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.canvas.surface};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const Separator = styled.span`
  width: 1px;
  height: 20px;
  background: ${({ theme }) => theme.canvas.elementBorder};
`;

interface ElementTool {
  readonly type: ElementType;
  readonly label: TranslationKey;
  readonly icon: ReactNode;
}

const ELEMENT_TOOLS: readonly ElementTool[] = [
  {
    type: 'text',
    label: 'canvas.toolbar.addText',
    icon: <Type aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    type: 'note',
    label: 'canvas.toolbar.addNote',
    icon: <StickyNote aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    type: 'task',
    label: 'canvas.toolbar.addTask',
    icon: <SquareCheck aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    type: 'frame',
    label: 'canvas.toolbar.addFrame',
    icon: <Frame aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    type: 'link',
    label: 'canvas.toolbar.addLink',
    icon: <Link2 aria-hidden="true" size={ICON_SIZE} />,
  },
];

interface ToolbarActionProps {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

function ToolbarAction({
  label,
  icon,
  onClick,
  disabled = false,
}: ToolbarActionProps): ReactElement {
  return (
    <Tooltip content={label} placement="bottom">
      <ToolbarButton aria-label={label} onClick={onClick} disabled={disabled}>
        {icon}
      </ToolbarButton>
    </Tooltip>
  );
}

export interface CanvasToolbarProps {
  readonly onCreateElement: (type: ElementType) => void;
  readonly onCreateConnector?: (mode: 'free' | 'bound') => void;
  readonly onDeleteSelection: () => void;
  readonly onFitView: () => void;
  readonly canCreate?: boolean;
  readonly canCreateFreeConnector?: boolean;
  readonly hasSelection?: boolean;
  readonly canCreateConnector?: boolean;
}

export function CanvasToolbar({
  onCreateElement,
  onCreateConnector,
  onDeleteSelection,
  onFitView,
  canCreate = false,
  canCreateFreeConnector = false,
  hasSelection = false,
  canCreateConnector = false,
}: CanvasToolbarProps): ReactElement {
  const { ref } = useRovingFocus<HTMLDivElement>();
  const { t } = useI18n();

  return (
    <Bar
      ref={ref}
      role="toolbar"
      aria-label={t('canvas.toolbar.label')}
      aria-orientation="horizontal"
      data-testid="canvas-toolbar"
    >
      <Group>
        {ELEMENT_TOOLS.map((tool) => {
          const disabled = !canCreate;

          return (
            <ToolbarAction
              key={tool.type}
              label={t(tool.label)}
              icon={tool.icon}
              disabled={disabled}
              onClick={() => onCreateElement(tool.type)}
            />
          );
        })}
        <ToolbarAction
          label={t('canvas.toolbar.addConnector')}
          icon={<ArrowUpRight aria-hidden="true" size={ICON_SIZE} />}
          disabled={!canCreateFreeConnector}
          onClick={() => onCreateConnector?.('free')}
        />
        <ToolbarAction
          label={t('canvas.toolbar.connectSelected')}
          icon={<Waypoints aria-hidden="true" size={ICON_SIZE} />}
          disabled={!canCreateConnector}
          onClick={() => onCreateConnector?.('bound')}
        />
      </Group>
      <Separator aria-hidden="true" />
      <Group>
        <ToolbarAction
          label={t('canvas.toolbar.fitView')}
          icon={<Scan aria-hidden="true" size={ICON_SIZE} />}
          onClick={onFitView}
        />
        <ToolbarAction
          label={t('canvas.toolbar.deleteSelection')}
          icon={<Trash2 aria-hidden="true" size={ICON_SIZE} />}
          disabled={!hasSelection}
          onClick={onDeleteSelection}
        />
      </Group>
    </Bar>
  );
}
