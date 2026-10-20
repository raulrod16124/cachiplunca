import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../../setup/render-with-theme';
import { createCanvasViewportStore } from '../../../../../../application/services';
import { createFrameElement, type FrameElement } from '../../../../../../domain/element';
import {
  Bounds,
  ElementId,
  Position,
  Size,
  UserId,
  WorkspaceId,
} from '../../../../../../domain/shared';
import {
  BoardPresentation,
  PRESENTATION_FIT_PADDING,
  type BoardPresentationProps,
} from '../../../../../../presentation/features/workspace-shell/components/board-presentation';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function frame(id: string, x: number, y: number): FrameElement {
  return createFrameElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(x, y),
    size: Size.create(400, 300),
    title: id,
  });
}

function expectFrameCentered(
  store: ReturnType<typeof createCanvasViewportStore>,
  bounds: Bounds,
): void {
  const viewport = store.getSnapshot();
  const screen = viewport.worldToScreen(Position.create(bounds.centerX, bounds.centerY));

  expect(screen.x).toBeCloseTo(viewport.size.width / 2);
  expect(screen.y).toBeCloseTo(viewport.size.height / 2);
}

function renderPresentation(overrides: Partial<BoardPresentationProps> = {}) {
  const store = overrides.store ?? createCanvasViewportStore(Size.create(1000, 800));
  const props: BoardPresentationProps = {
    frame: frame('frame-1', 0, 0),
    index: 0,
    total: 2,
    store,
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onExit: jest.fn(),
    ...overrides,
  };

  const view = render(<BoardPresentation {...props} />);

  return { ...view, props, store };
}

describe('BoardPresentation', () => {
  it('fits the presented frame into the viewport', () => {
    const { store, props } = renderPresentation();
    const bounds = Bounds.of(props.frame.position, props.frame.size);
    const viewport = store.getSnapshot();

    expect(viewport.transform.scale).toBeCloseTo(
      Math.min(
        (1000 - PRESENTATION_FIT_PADDING * 2) / 400,
        (800 - PRESENTATION_FIT_PADDING * 2) / 300,
      ),
    );
    expectFrameCentered(store, bounds);
  });

  it('fits again when the viewport size changes and when the frame changes', () => {
    const { store, rerender } = renderPresentation();

    act(() => {
      store.resize(Size.create(1200, 600));
    });

    expectFrameCentered(store, Bounds.of(Position.create(0, 0), Size.create(400, 300)));

    rerender(
      <BoardPresentation
        frame={frame('frame-2', 2000, 1500)}
        index={1}
        total={2}
        store={store}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        onExit={jest.fn()}
      />,
    );

    expectFrameCentered(store, Bounds.of(Position.create(2000, 1500), Size.create(400, 300)));
  });

  it('shows the counter and disables navigation at the boundaries', async () => {
    const user = userEvent.setup();
    const { props, rerender } = renderPresentation({ index: 0, total: 2 });

    expect(screen.getByRole('status')).toHaveTextContent('Frame 1 of 2');
    expect(screen.getByRole('button', { name: 'Previous frame' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next frame' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next frame' }));
    expect(props.onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Exit presentation' }));
    expect(props.onExit).toHaveBeenCalledTimes(1);

    rerender(
      <BoardPresentation
        frame={frame('frame-2', 0, 0)}
        index={1}
        total={2}
        store={props.store}
        onPrevious={props.onPrevious}
        onNext={props.onNext}
        onExit={props.onExit}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Frame 2 of 2');
    expect(screen.getByRole('button', { name: 'Previous frame' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next frame' })).toBeDisabled();
  });

  it('navigates and exits with the keyboard without reaching the canvas', () => {
    const { props } = renderPresentation({ index: 1, total: 3 });
    const region = screen.getByTestId('board-presentation');
    const bubbleListener = jest.fn();

    document.addEventListener('keydown', bubbleListener);

    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(props.onNext).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(props.onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(region, { key: 'Escape' });
    expect(props.onExit).toHaveBeenCalledTimes(1);
    expect(bubbleListener).not.toHaveBeenCalled();

    document.removeEventListener('keydown', bubbleListener);
  });

  it('does not consume keys typed in editable fields', () => {
    const { props } = renderPresentation();
    const input = document.createElement('input');

    document.body.append(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(props.onNext).not.toHaveBeenCalled();
    input.remove();
  });

  it('focuses the presentation region when it opens', () => {
    renderPresentation();

    expect(screen.getByTestId('board-presentation')).toHaveFocus();
  });
});
