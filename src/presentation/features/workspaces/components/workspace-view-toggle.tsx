import { LayoutGrid, List } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ToolbarButton } from '../../../components/toolbar-button';
import { useI18n } from '../../../i18n';

export type WorkspaceViewMode = 'grid' | 'list';

const Group = styled.div`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0;
  margin-left: auto;
  padding: ${({ theme }) => theme.space[1]};
  border: 1px solid var(--stitch-border);
  border-radius: var(--stitch-radius-control);
  background: var(--stitch-surface-container);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--stitch-text) 6%, transparent);
`;

const ToggleButton = styled(ToolbarButton)`
  &.rr-icon-button {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--stitch-text-subtle);
    box-shadow: none;
  }

  &.rr-icon-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--stitch-text) 6%, transparent);
    color: var(--stitch-text);
  }

  &.rr-icon-button.rr-icon-button--primary {
    background: var(--stitch-surface);
    color: var(--stitch-secondary);
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  &.rr-icon-button.rr-icon-button--primary:hover:not(:disabled) {
    background: var(--stitch-surface);
    color: var(--stitch-secondary);
  }
`;

export interface WorkspaceViewToggleProps {
  readonly value: WorkspaceViewMode;
  readonly onChange: (value: WorkspaceViewMode) => void;
}

export function WorkspaceViewToggle({ value, onChange }: WorkspaceViewToggleProps): ReactNode {
  const { t } = useI18n();

  return (
    <Group role="group" aria-label={t('workspaces.view.label')}>
      <ToggleButton
        type="button"
        size="md"
        label={t('workspaces.view.grid')}
        active={value === 'grid'}
        aria-pressed={value === 'grid'}
        data-testid="workspaces-view-grid"
        onClick={() => onChange('grid')}
      >
        <LayoutGrid aria-hidden="true" size={16} />
      </ToggleButton>
      <ToggleButton
        type="button"
        size="md"
        label={t('workspaces.view.list')}
        active={value === 'list'}
        aria-pressed={value === 'list'}
        data-testid="workspaces-view-list"
        onClick={() => onChange('list')}
      >
        <List aria-hidden="true" size={16} />
      </ToggleButton>
    </Group>
  );
}
