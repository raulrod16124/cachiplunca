import { CalendarDays, ClipboardList, LayoutGrid, Shapes, Sparkles } from '@raulrod/icons';

import type { WorkspaceType } from '../../domain/workspace';

export interface WorkspaceTypeIconProps {
  readonly type: WorkspaceType;
  readonly size?: number;
  readonly className?: string;
  readonly 'aria-hidden'?: boolean;
}

const ICONS: Record<WorkspaceType, typeof Shapes> = {
  general: Shapes,
  work: LayoutGrid,
  travel: CalendarDays,
  tasks: ClipboardList,
  ideas: Sparkles,
};

export function WorkspaceTypeIcon({
  type,
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
}: WorkspaceTypeIconProps) {
  const Icon = ICONS[type];

  return <Icon size={size} className={className} aria-hidden={ariaHidden} />;
}
