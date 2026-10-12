import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { createTextElement, type Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { createFunctionCommand } from '../../../../../application/commands';
import { createCommandHistory } from '../../../../../application/services';
import {
  useElementUndo,
  type UseElementUndoOptions,
} from '../../../../../presentation/canvas/hooks/use-element-undo';

interface UndoTestbenchProps extends UseElementUndoOptions {
  readonly children?: ReactNode;
}

function UndoTestbench({ children, ...options }: UndoTestbenchProps): ReactElement {
  const { ref } = useElementUndo(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="undo-surface"
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

function historyWithRecordedCommand() {
  const history = createCommandHistory<readonly Element[]>({ initial: [FIRST_ITEM] });

  history.execute(
    createFunctionCommand<readonly Element[]>({
      metadata: { label: 'Add second' },
      apply: () => ({ status: 'ok', state: [FIRST_ITEM, SECOND_ITEM] }),
      revert: () => ({ status: 'ok', state: [FIRST_ITEM] }),
    }),
  );

  return history;
}

describe('useElementUndo', () => {
  it('does not call any handler without a keydown', () => {
    const onUndoElements = jest.fn();

    render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements} />,
    );

    expect(onUndoElements).not.toHaveBeenCalled();
  });

  it('undoes the last command on Ctrl+Z and emits the previous state', async () => {
    const onUndoElements = jest.fn();
    const history = historyWithRecordedCommand();
    render(<UndoTestbench history={history} onUndoElements={onUndoElements} />);

    screen.getByTestId('undo-surface').focus();
    await userEvent.setup().keyboard('{Control>}z{/Control}');

    expect(onUndoElements).toHaveBeenCalledTimes(1);
    expect(onUndoElements).toHaveBeenCalledWith([FIRST_ITEM]);
    expect(history.canUndo()).toBe(false);
  });

  it('undoes on Cmd+Z', async () => {
    const onUndoElements = jest.fn();
    render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements} />,
    );

    screen.getByTestId('undo-surface').focus();
    await userEvent.setup().keyboard('{Meta>}z{/Meta}');

    expect(onUndoElements).toHaveBeenCalledTimes(1);
    expect(onUndoElements).toHaveBeenCalledWith([FIRST_ITEM]);
  });

  it('does nothing when there is nothing to undo', async () => {
    const onUndoElements = jest.fn();
    const history = createCommandHistory<readonly Element[]>({ initial: [FIRST_ITEM] });
    render(<UndoTestbench history={history} onUndoElements={onUndoElements} />);

    const surface = screen.getByTestId('undo-surface');
    surface.focus();
    const notPrevented = fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });

    expect(notPrevented).toBe(true);
    expect(onUndoElements).not.toHaveBeenCalled();
  });

  it('ignores repeated keydowns', () => {
    const onUndoElements = jest.fn();
    render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements} />,
    );

    const surface = screen.getByTestId('undo-surface');

    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true, repeat: true });

    expect(onUndoElements).toHaveBeenCalledTimes(1);
  });

  it('ignores commands while an editable target is focused', async () => {
    const onUndoElements = jest.fn();
    render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements}>
        <input data-testid="editable" />
      </UndoTestbench>,
    );

    screen.getByTestId('editable').focus();
    await userEvent.setup().keyboard('{Control>}z{/Control}');

    expect(onUndoElements).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onUndoElements = jest.fn();
    render(
      <UndoTestbench
        history={historyWithRecordedCommand()}
        onUndoElements={onUndoElements}
        disabled
      />,
    );

    screen.getByTestId('undo-surface').focus();
    await userEvent.setup().keyboard('{Control>}z{/Control}');

    expect(onUndoElements).not.toHaveBeenCalled();
  });

  it('does nothing without a history', async () => {
    const onUndoElements = jest.fn();
    render(<UndoTestbench onUndoElements={onUndoElements} />);

    screen.getByTestId('undo-surface').focus();
    await userEvent.setup().keyboard('{Control>}z{/Control}');

    expect(onUndoElements).not.toHaveBeenCalled();
  });

  it('prevents the default action for undo when there is something to undo', () => {
    const onUndoElements = jest.fn();
    render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements} />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByTestId('undo-surface'), {
      key: 'z',
      ctrlKey: true,
    });

    expect(notPrevented).toBe(false);
    expect(onUndoElements).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onUndoElements = jest.fn();
    const { unmount } = render(
      <UndoTestbench history={historyWithRecordedCommand()} onUndoElements={onUndoElements} />,
    );

    const surface = screen.getByTestId('undo-surface');
    unmount();
    fireEvent.keyDown(surface, { key: 'z', ctrlKey: true });

    expect(onUndoElements).not.toHaveBeenCalled();
  });
});
