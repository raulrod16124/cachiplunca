import { fireEvent, render, screen } from '../setup/render-with-theme';
import { localeWrapper } from '../setup/locale-wrapper';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import { createTextElement } from '../../domain/element';
import type { Element } from '../../domain/element';
import { createCanvasViewportStore, createSelectionStore } from '../../application/services';
import { Canvas } from '../../presentation/canvas/components/canvas';
import { MESSAGES } from '../../presentation/i18n';
import { installDragEventPolyfill } from '../fixtures/drag-event';

jest.mock('../../presentation/canvas/components/rich-text-editor', () =>
  require('../fixtures/rich-text-editor-stub'),
);

function createText(id: string, x: number, y: number): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(120, 80),
    content: 'hello',
  });
}

function renderCanvasInSpanish(elements: readonly Element[]) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(<Canvas store={store} selectionStore={selectionStore} elements={elements} />, {
    wrapper: localeWrapper('es'),
  });

  return { store, selectionStore };
}

describe('Canvas context menu i18n', () => {
  beforeAll(() => {
    installDragEventPolyfill();
  });

  it('shows the layer actions in Spanish after right-clicking an element', async () => {
    renderCanvasInSpanish([createText('first', 100, 100)]);

    fireEvent.contextMenu(screen.getByRole('application'), {
      clientX: 150,
      clientY: 130,
    });

    expect(
      await screen.findByRole('menuitem', {
        name: MESSAGES.es['shortcuts.selection.bringToFront'],
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: MESSAGES.es['shortcuts.selection.sendToBack'] }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: MESSAGES.en['shortcuts.selection.bringToFront'],
      }),
    ).not.toBeInTheDocument();
  });
});
