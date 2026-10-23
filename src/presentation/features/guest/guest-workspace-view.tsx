import { Badge, Text } from '@raulrod/ui';
import { useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import {
  createCanvasViewportStore,
  createCommandHistory,
  createSelectionStore,
} from '../../../application/services';
import type { Element } from '../../../domain/element';
import type { ElementId } from '../../../domain/shared';
import { Size } from '../../../domain/shared';
import type { Workspace } from '../../../domain/workspace';
import { Canvas } from '../../canvas';
import { useI18n } from '../../i18n';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--stitch-canvas-bg, ${({ theme }) => theme.canvas.surface});
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex: none;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
  background: ${({ theme }) => theme.color.background.surface};
`;

const Identity = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Brand = styled.span`
  flex: none;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.color.text.muted};
`;

const Title = styled.h1`
  overflow: hidden;
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CanvasArea = styled.main`
  flex: 1 1 auto;
  min-height: 0;
`;

export interface GuestWorkspaceViewProps {
  readonly workspace: Workspace;
  readonly elements: readonly Element[];
  readonly generateElementId: () => ElementId;
}

export function GuestWorkspaceView({
  workspace,
  elements,
  generateElementId,
}: GuestWorkspaceViewProps): ReactNode {
  const { t } = useI18n();
  const viewportStore = useStableValue(() => createCanvasViewportStore(Size.create(800, 600)));
  const selectionStore = useStableValue(createSelectionStore);
  const history = useStableValue(() =>
    createCommandHistory<readonly Element[]>({ initial: elements }),
  );

  return (
    <Shell data-surface="stitch" data-board="true">
      <Header>
        <Identity>
          <Brand>{t('brand.name')}</Brand>
          <Title>{workspace.name}</Title>
        </Identity>
        <Text role="status">
          <Badge variant="warning">{t('guest.viewOnly')}</Badge>
        </Text>
      </Header>
      <CanvasArea id="main-content" tabIndex={-1}>
        <Canvas
          store={viewportStore}
          selectionStore={selectionStore}
          elements={elements}
          history={history}
          generateId={generateElementId}
          readOnly
        />
      </CanvasArea>
    </Shell>
  );
}

function useStableValue<T>(factory: () => T): T {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref.current;
}
