import { Tooltip } from '@raulrod/ui';
import {
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
  readonly label: string;
  readonly icon: ReactNode;
}

const ELEMENT_TOOLS: readonly ElementTool[] = [
  { type: 'text', label: 'Add text', icon: <Type aria-hidden="true" size={ICON_SIZE} /> },
  { type: 'note', label: 'Add note', icon: <StickyNote aria-hidden="true" size={ICON_SIZE} /> },
  { type: 'task', label: 'Add task', icon: <SquareCheck aria-hidden="true" size={ICON_SIZE} /> },
  { type: 'frame', label: 'Add frame', icon: <Frame aria-hidden="true" size={ICON_SIZE} /> },
  { type: 'link', label: 'Add link', icon: <Link2 aria-hidden="true" size={ICON_SIZE} /> },
  {
    type: 'connector',
    label: 'Connect selected elements',
    icon: <Waypoints aria-hidden="true" size={ICON_SIZE} />,
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
  readonly onDeleteSelection: () => void;
  readonly onFitView: () => void;
  readonly canCreate?: boolean;
  readonly hasSelection?: boolean;
  readonly canCreateConnector?: boolean;
}

export function CanvasToolbar({
  onCreateElement,
  onDeleteSelection,
  onFitView,
  canCreate = false,
  hasSelection = false,
  canCreateConnector = false,
}: CanvasToolbarProps): ReactElement {
  const { ref } = useRovingFocus<HTMLDivElement>();

  return (
    <Bar
      ref={ref}
      role="toolbar"
      aria-label="Canvas toolbar"
      aria-orientation="horizontal"
      data-testid="canvas-toolbar"
    >
      <Group>
        {ELEMENT_TOOLS.map((tool) => {
          const disabled = !canCreate || (tool.type === 'connector' && !canCreateConnector);

          return (
            <ToolbarAction
              key={tool.type}
              label={tool.label}
              icon={tool.icon}
              disabled={disabled}
              onClick={() => onCreateElement(tool.type)}
            />
          );
        })}
      </Group>
      <Separator aria-hidden="true" />
      <Group>
        <ToolbarAction
          label="Fit view"
          icon={<Scan aria-hidden="true" size={ICON_SIZE} />}
          onClick={onFitView}
        />
        <ToolbarAction
          label="Delete selection"
          icon={<Trash2 aria-hidden="true" size={ICON_SIZE} />}
          disabled={!hasSelection}
          onClick={onDeleteSelection}
        />
      </Group>
    </Bar>
  );
}
