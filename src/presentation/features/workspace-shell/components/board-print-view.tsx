import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { elementContentBounds, resolveConnectorGeometry } from '../../../../application/services';
import type { ConnectorGeometry } from '../../../../application/services';
import { isConnectorElement, type Element } from '../../../../domain/element';
import type { Bounds } from '../../../../domain/shared';
import { ElementView } from '../../../canvas/renderers';
import { useI18n } from '../../../i18n';

const PRINT_PAGE_WIDTH = 1120;
const PRINT_PAGE_HEIGHT = 640;

const Root = styled.div`
  display: none;
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.color.background.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: 20px;
  font-weight: 700;
`;

const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.text.muted};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: 12px;
`;

const Page = styled.div`
  position: relative;
  overflow: hidden;
  break-inside: avoid;
  border: 1px solid ${({ theme }) => theme.color.border.strong};
  background: ${({ theme }) => theme.color.background.surface};
`;

const World = styled.div`
  position: absolute;
  transform-origin: 0 0;
`;

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space[6]};
  border: 1px dashed ${({ theme }) => theme.color.border.strong};
  color: ${({ theme }) => theme.color.text.muted};
  font-family: ${({ theme }) => theme.font.family.sans};
  text-align: center;
`;

function printScale(bounds: Bounds): number {
  return Math.min(
    1,
    PRINT_PAGE_WIDTH / Math.max(bounds.width, 1),
    PRINT_PAGE_HEIGHT / Math.max(bounds.height, 1),
  );
}

export interface BoardPrintViewProps {
  readonly workspaceName: string;
  readonly elements: readonly Element[];
  readonly exportedAt: Date;
}

export function BoardPrintView({
  workspaceName,
  elements,
  exportedAt,
}: BoardPrintViewProps): ReactNode {
  const { t } = useI18n();
  const bounds = useMemo(() => elementContentBounds(elements), [elements]);
  const orderedElements = useMemo<readonly Element[]>(() => {
    const connectors = elements.filter((element) => isConnectorElement(element));
    const others = elements.filter((element) => !isConnectorElement(element));

    return [...connectors, ...others];
  }, [elements]);
  const connectorGeometries = useMemo<ReadonlyMap<string, ConnectorGeometry>>(() => {
    const elementsById = new Map(elements.map((element) => [element.id.value, element]));
    const geometries = new Map<string, ConnectorGeometry>();

    for (const element of elements) {
      if (!isConnectorElement(element)) {
        continue;
      }

      const geometry = resolveConnectorGeometry(element, elementsById);

      if (geometry !== null) {
        geometries.set(element.id.value, geometry);
      }
    }

    return geometries;
  }, [elements]);
  const scale = bounds === null ? 1 : printScale(bounds);
  const exportedOn = exportedAt.toISOString().slice(0, 10);

  return createPortal(
    <Root className="board-print-root" data-testid="board-print-view">
      <Header>
        <Title>{workspaceName}</Title>
        <Meta>{t('canvas.print.exportedOn', { date: exportedOn })}</Meta>
      </Header>
      {bounds === null ? (
        <Empty>{t('canvas.print.empty')}</Empty>
      ) : (
        <Page
          style={{
            width: `${bounds.width * scale}px`,
            height: `${bounds.height * scale}px`,
          }}
        >
          <World
            style={{
              width: `${bounds.width}px`,
              height: `${bounds.height}px`,
              transform: `scale(${scale}) translate(${-bounds.x}px, ${-bounds.y}px)`,
            }}
          >
            {orderedElements.map((element) => {
              const geometry = connectorGeometries.get(element.id.value);

              return (
                <ElementView
                  key={element.id.value}
                  element={element}
                  selected={false}
                  showTypeLabel={false}
                  connectorStart={geometry?.start}
                  connectorEnd={geometry?.end}
                />
              );
            })}
          </World>
        </Page>
      )}
    </Root>,
    document.body,
  );
}
