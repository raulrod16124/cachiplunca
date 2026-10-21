import { DropdownMenu, Tooltip } from '@raulrod/ui';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  ArrowUpRight,
  Frame,
  Image as ImageIcon,
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
import type { AlignmentMode, DistributionAxis } from '../../../application/services';
import type { ElementType } from '../../../domain/element';
import { ToolbarButton } from '../../components';
import { useRovingFocus } from '../../hooks';
import { useMediaQuery } from '../../hooks/use-media-query';
import { useI18n, type TranslationKey } from '../../i18n';

const ICON_SIZE = 16;

const ArrangeTrigger = styled(DropdownMenu.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: calc(${({ theme }) => theme.font.size.base} + ${({ theme }) => theme.space[4]} + 2px);
  height: calc(${({ theme }) => theme.font.size.base} + ${({ theme }) => theme.space[4]} + 2px);
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.base};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: ${({ theme }) => theme.font.leading.none};
  letter-spacing: ${({ theme }) => theme.font.tracking.normal};
  cursor: pointer;
  transition-property: background-color, color;
  transition-duration: ${({ theme }) => theme.motion.duration.fast};
  transition-timing-function: ${({ theme }) => theme.motion.easing.standard};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.background.sunken};
  }

  &:active:not(:disabled) {
    background: color-mix(
      in srgb,
      ${({ theme }) => theme.color.background.sunken} 82%,
      ${({ theme }) => theme.color.text.primary}
    );
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

const Bar = styled.div`
  position: absolute;
  top: 50%;
  left: ${({ theme }) => theme.space[4]};
  transform: translateY(-50%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  max-height: calc(100% - var(--rr-space-4) * 2);
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[1]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.surface};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  box-shadow: ${({ theme }) => theme.shadow.md};
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;

  @media (max-width: 900px) {
    top: auto;
    bottom: calc(var(--rr-space-4) + var(--rr-space-16) + var(--rr-space-2));
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    max-width: calc(100% - var(--rr-space-3) * 2);
    max-height: none;
    padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    overscroll-behavior-y: auto;
    scrollbar-width: thin;
  }
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};

  @media (max-width: 900px) {
    flex-direction: row;
  }
`;

const Separator = styled.span`
  flex: none;
  width: ${({ theme }) => theme.space[5]};
  height: 1px;
  background: ${({ theme }) => theme.color.border.default};

  @media (max-width: 900px) {
    width: 1px;
    height: ${({ theme }) => theme.space[5]};
  }
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
  {
    type: 'image',
    label: 'canvas.toolbar.addImage',
    icon: <ImageIcon aria-hidden="true" size={ICON_SIZE} />,
  },
];

interface AlignmentTool {
  readonly mode: AlignmentMode;
  readonly label: TranslationKey;
  readonly icon: ReactNode;
}

const ALIGNMENT_TOOLS: readonly AlignmentTool[] = [
  {
    mode: 'left',
    label: 'canvas.toolbar.alignLeft',
    icon: <AlignStartVertical aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    mode: 'center-horizontal',
    label: 'canvas.toolbar.alignCenterHorizontal',
    icon: <AlignCenterVertical aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    mode: 'right',
    label: 'canvas.toolbar.alignRight',
    icon: <AlignEndVertical aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    mode: 'top',
    label: 'canvas.toolbar.alignTop',
    icon: <AlignStartHorizontal aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    mode: 'center-vertical',
    label: 'canvas.toolbar.alignCenterVertical',
    icon: <AlignCenterHorizontal aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    mode: 'bottom',
    label: 'canvas.toolbar.alignBottom',
    icon: <AlignEndHorizontal aria-hidden="true" size={ICON_SIZE} />,
  },
];

interface DistributionTool {
  readonly axis: DistributionAxis;
  readonly label: TranslationKey;
  readonly icon: ReactNode;
}

const DISTRIBUTION_TOOLS: readonly DistributionTool[] = [
  {
    axis: 'horizontal',
    label: 'canvas.toolbar.distributeHorizontal',
    icon: <AlignHorizontalSpaceBetween aria-hidden="true" size={ICON_SIZE} />,
  },
  {
    axis: 'vertical',
    label: 'canvas.toolbar.distributeVertical',
    icon: <AlignVerticalSpaceBetween aria-hidden="true" size={ICON_SIZE} />,
  },
];

interface ToolbarActionProps {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly tooltipPlacement: 'bottom' | 'right';
}

function ToolbarAction({
  label,
  icon,
  onClick,
  disabled = false,
  tooltipPlacement,
}: ToolbarActionProps): ReactElement {
  return (
    <Tooltip content={label} placement={tooltipPlacement}>
      <ToolbarButton label={label} onClick={onClick} disabled={disabled}>
        {icon}
      </ToolbarButton>
    </Tooltip>
  );
}

export interface CanvasActionsToolbarProps {
  readonly onCreateElement: (type: ElementType) => void;
  readonly onCreateConnector?: (mode: 'free' | 'bound') => void;
  readonly onDeleteSelection: () => void;
  readonly onFitView: () => void;
  readonly onAlign?: (mode: AlignmentMode) => void;
  readonly onDistribute?: (axis: DistributionAxis) => void;
  readonly canCreate?: boolean;
  readonly canCreateImage?: boolean;
  readonly canCreateFreeConnector?: boolean;
  readonly hasSelection?: boolean;
  readonly canCreateConnector?: boolean;
  readonly canAlign?: boolean;
  readonly canDistribute?: boolean;
}

export function CanvasActionsToolbar({
  onCreateElement,
  onCreateConnector,
  onDeleteSelection,
  onFitView,
  onAlign,
  onDistribute,
  canCreate = false,
  canCreateImage = canCreate,
  canCreateFreeConnector = false,
  hasSelection = false,
  canCreateConnector = false,
  canAlign = false,
  canDistribute = false,
}: CanvasActionsToolbarProps): ReactElement {
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const orientation = isNarrow ? 'horizontal' : 'vertical';
  const tooltipPlacement = isNarrow ? 'bottom' : 'right';
  const { ref } = useRovingFocus<HTMLDivElement>({ orientation });
  const { t } = useI18n();
  const showArrange = onAlign !== undefined || onDistribute !== undefined;

  return (
    <Bar
      ref={ref}
      role="toolbar"
      aria-label={t('canvas.toolbar.label')}
      aria-orientation={orientation}
      data-testid="canvas-toolbar"
    >
      <Group>
        {ELEMENT_TOOLS.map((tool) => {
          const disabled = tool.type === 'image' ? !canCreateImage : !canCreate;

          return (
            <ToolbarAction
              key={tool.type}
              label={t(tool.label)}
              icon={tool.icon}
              disabled={disabled}
              tooltipPlacement={tooltipPlacement}
              onClick={() => onCreateElement(tool.type)}
            />
          );
        })}
        <ToolbarAction
          label={t('canvas.toolbar.addConnector')}
          icon={<ArrowUpRight aria-hidden="true" size={ICON_SIZE} />}
          disabled={!canCreateFreeConnector}
          tooltipPlacement={tooltipPlacement}
          onClick={() => onCreateConnector?.('free')}
        />
        <ToolbarAction
          label={t('canvas.toolbar.connectSelected')}
          icon={<Waypoints aria-hidden="true" size={ICON_SIZE} />}
          disabled={!canCreateConnector}
          tooltipPlacement={tooltipPlacement}
          onClick={() => onCreateConnector?.('bound')}
        />
      </Group>
      {showArrange ? (
        <>
          <Separator aria-hidden="true" />
          <Tooltip content={t('canvas.toolbar.arrange')} placement={tooltipPlacement}>
            <DropdownMenu>
              <ArrangeTrigger
                aria-label={t('canvas.toolbar.arrange')}
                disabled={!canAlign && !canDistribute}
                data-testid="canvas-arrange-trigger"
              >
                <AlignHorizontalSpaceBetween aria-hidden="true" size={ICON_SIZE} />
              </ArrangeTrigger>
              <DropdownMenu.Content placement={isNarrow ? 'bottom-start' : 'right-start'}>
                {onAlign === undefined
                  ? null
                  : ALIGNMENT_TOOLS.map((tool) => (
                      <DropdownMenu.Item
                        key={tool.mode}
                        onSelect={() => onAlign(tool.mode)}
                        startIcon={tool.icon}
                      >
                        {t(tool.label)}
                      </DropdownMenu.Item>
                    ))}
                {onAlign === undefined || onDistribute === undefined ? null : (
                  <DropdownMenu.Separator />
                )}
                {onDistribute === undefined
                  ? null
                  : DISTRIBUTION_TOOLS.map((tool) => (
                      <DropdownMenu.Item
                        key={tool.axis}
                        onSelect={() => onDistribute(tool.axis)}
                        startIcon={tool.icon}
                        disabled={!canDistribute}
                      >
                        {t(tool.label)}
                      </DropdownMenu.Item>
                    ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          </Tooltip>
        </>
      ) : null}
      <Separator aria-hidden="true" />
      <Group>
        <ToolbarAction
          label={t('canvas.toolbar.fitView')}
          icon={<Scan aria-hidden="true" size={ICON_SIZE} />}
          tooltipPlacement={tooltipPlacement}
          onClick={onFitView}
        />
        <ToolbarAction
          label={t('canvas.toolbar.deleteSelection')}
          icon={<Trash2 aria-hidden="true" size={ICON_SIZE} />}
          disabled={!hasSelection}
          tooltipPlacement={tooltipPlacement}
          onClick={onDeleteSelection}
        />
      </Group>
    </Bar>
  );
}
