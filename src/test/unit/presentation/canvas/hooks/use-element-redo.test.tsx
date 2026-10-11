import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { createTextElement, type Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { createFunctionCommand } from '../../../../../application/commands';
import { createCommandHistory } from '../../../../../application/services';
import {
  useElementRedo,
  type UseElementRedoOptions,
} from '../../../../../presentation/canvas/hooks/use-element-redo';

interface RedoTestbenchProps extends UseElementRedoOptions {
  readonly children?: ReactNode;
}

function RedoTestbench({ children, ...options }: RedoTestbenchProps): ReactElement {
  const { ref } = useElementRedo(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="redo-surface"
      role="application"
      aria-label="Canvas"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const CREATED_AT = new Date('2024-01-01T00:00:00Z');

function createElement(id: string): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(100, 40),
    content: 'hello',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

const FIRST_ITEM = createElement('first');
const SECOND_ITEM = createElement('second');

function historyWithUndoneCommand() {
  const history = createCommandHistory<readonly Element[]>({ initial: [FIRST_ITEM] });

  history.execute(
    createFunctionCommand<readonly Element[]>({
      metadata: { label: 'Add second' },
      apply: () => ({ status: 'ok', state: [FIRST_ITEM, SECOND_ITEM] }),
      revert: () => ({ status: 'ok', state: [FIRST_ITEM] }),
    }),
  );
  history.undo();

  return history;
}

describe('useElementRedo', () => {
  it('does not call any handler without a keydown', () => {
    const onRedoElements = jest.fn();

    render(<RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />);

    expect(onRedoElements).not.toHaveBeenCalled();
  });

  it('redoes the last undone command on Ctrl+Shift+Z and emits the next state', async () => {
    const onRedoElements = jest.fn();
    const history = historyWithUndoneCommand();
    render(<RedoTestbench history={history} onRedoElements={onRedoElements} />);

    screen.getByTestId('redo-surface').focus();
    await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(onRedoElements).toHaveBeenCalledTimes(1);
    expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
    expect(history.canRedo()).toBe(false);
  });

  it('redoes on Cmd+Shift+Z', async () => {
    const onRedoElements = jest.fn();
    render(<RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />);

    screen.getByTestId('redo-surface').focus();
    await userEvent.setup().keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');

    expect(onRedoElements).toHaveBeenCalledTimes(1);
    expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
  });

  it('redoes on Ctrl+Y', async () => {
    const onRedoElements = jest.fn();
    render(<RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />);

    screen.getByTestId('redo-surface').focus();
    await userEvent.setup().keyboard('{Control>}y{/Control}');

    expect(onRedoElements).toHaveBeenCalledTimes(1);
    expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
  });

  it('does nothing when there is nothing to redo', async () => {
    const onRedoElements = jest.fn();
    const history = createCommandHistory<readonly Element[]>({ initial: [FIRST_ITEM] });
    render(<RedoTestbench history={history} onRedoElements={onRedoElements} />);

    const surface = screen.getByTestId('redo-surface');
    surface.focus();
    const notPrevented = fireEvent.keyDown(surface, { key: 'z', ctrlKey: true, shiftKey: true });

    expect(notPrevented).toBe(true);
    expect(onRedoElements).not.toHaveBeenCalled();
  });

  it('ignores repeated keydowns', () => {
    const onRedoElements = jest.fn();
    render(<RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />);

    const surface = screen.getByTestId('redo-surface');

    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true, shiftKey: true, repeat: true });

    expect(onRedoElements).toHaveBeenCalledTimes(1);
  });

  it('ignores commands while an editable target is focused', async () => {
    const onRedoElements = jest.fn();
    render(
      <RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements}>
        <input data-testid="editable" />
      </RedoTestbench>,
    );

    screen.getByTestId('editable').focus();
    await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(onRedoElements).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onRedoElements = jest.fn();
    render(
      <RedoTestbench
        history={historyWithUndoneCommand()}
        onRedoElements={onRedoElements}
        disabled
      />,
    );

    screen.getByTestId('redo-surface').focus();
    await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(onRedoElements).not.toHaveBeenCalled();
  });

  it('does nothing without a history', async () => {
    const onRedoElements = jest.fn();
    render(<RedoTestbench onRedoElements={onRedoElements} />);

    screen.getByTestId('redo-surface').focus();
    await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(onRedoElements).not.toHaveBeenCalled();
  });

  it('prevents the default action for redo when there is something to redo', () => {
    const onRedoElements = jest.fn();
    render(<RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />);

    const notPrevented = fireEvent.keyDown(screen.getByTestId('redo-surface'), {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(notPrevented).toBe(false);
    expect(onRedoElements).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onRedoElements = jest.fn();
    const { unmount } = render(
      <RedoTestbench history={historyWithUndoneCommand()} onRedoElements={onRedoElements} />,
    );

    const surface = screen.getByTestId('redo-surface');
    unmount();
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true, shiftKey: true });

    expect(onRedoElements).not.toHaveBeenCalled();
  });
});
