import { LayoutGrid, List } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ToolbarButton } from '../../../components/toolbar-button';
import { useI18n } from '../../../i18n';

export type WorkspaceViewMode = 'grid' | 'list';

const Group = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  flex: none;
  margin-left: auto;
`;

export interface WorkspaceViewToggleProps {
  readonly value: WorkspaceViewMode;
  readonly onChange: (value: WorkspaceViewMode) => void;
}

export function WorkspaceViewToggle({ value, onChange }: WorkspaceViewToggleProps): ReactNode {
  const { t } = useI18n();

  return (
    <Group role="group" aria-label={t('workspaces.view.label')}>
      <ToolbarButton
        type="button"
        size="md"
        label={t('workspaces.view.grid')}
        active={value === 'grid'}
        aria-pressed={value === 'grid'}
        data-testid="workspaces-view-grid"
        onClick={() => onChange('grid')}
      >
        <LayoutGrid aria-hidden="true" size={16} />
      </ToolbarButton>
      <ToolbarButton
        type="button"
        size="md"
        label={t('workspaces.view.list')}
        active={value === 'list'}
        aria-pressed={value === 'list'}
        data-testid="workspaces-view-list"
        onClick={() => onChange('list')}
      >
        <List aria-hidden="true" size={16} />
      </ToolbarButton>
    </Group>
  );
}
