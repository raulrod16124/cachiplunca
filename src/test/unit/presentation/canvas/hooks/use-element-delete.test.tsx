import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { createTextElement, type Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import {
  useElementDelete,
  type UseElementDeleteOptions,
} from '../../../../../presentation/canvas/hooks/use-element-delete';

interface DeleteTestbenchProps extends UseElementDeleteOptions {
  readonly children?: ReactNode;
}

function DeleteTestbench({ children, ...options }: DeleteTestbenchProps): ReactElement {
  const { ref } = useElementDelete(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="delete-surface"
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

describe('useElementDelete', () => {
  it('does not call any handler without a keydown', () => {
    const onDeleteElements = jest.fn();
    const onSelectionCleared = jest.fn();

    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
        onSelectionCleared={onSelectionCleared}
      />,
    );

    expect(onDeleteElements).not.toHaveBeenCalled();
    expect(onSelectionCleared).not.toHaveBeenCalled();
  });

  it('deletes the selected elements on Delete and clears the selection', async () => {
    const onDeleteElements = jest.fn();
    const onSelectionCleared = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
        onSelectionCleared={onSelectionCleared}
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onDeleteElements).toHaveBeenCalledTimes(1);
    expect(onDeleteElements).toHaveBeenCalledWith([SECOND_ITEM]);
    expect(onSelectionCleared).toHaveBeenCalledTimes(1);
  });

  it('deletes every selected element in a multi selection', async () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first', 'second']}
        onDeleteElements={onDeleteElements}
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onDeleteElements).toHaveBeenCalledWith([]);
  });

  it('does nothing when the selection is empty', async () => {
    const onDeleteElements = jest.fn();
    const onSelectionCleared = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={[]}
        onDeleteElements={onDeleteElements}
        onSelectionCleared={onSelectionCleared}
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onDeleteElements).not.toHaveBeenCalled();
    expect(onSelectionCleared).not.toHaveBeenCalled();
  });

  it('ignores Backspace', async () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Backspace}');

    expect(onDeleteElements).not.toHaveBeenCalled();
  });

  it('ignores repeated keydowns', () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
      />,
    );

    const surface = screen.getByTestId('delete-surface');

    fireEvent.keyDown(surface, { key: 'Delete' });
    fireEvent.keyDown(surface, { key: 'Delete', repeat: true });

    expect(onDeleteElements).toHaveBeenCalledTimes(1);
  });

  it('ignores commands while an editable target is focused', async () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
      >
        <input data-testid="editable" />
      </DeleteTestbench>,
    );

    screen.getByTestId('editable').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onDeleteElements).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
        disabled
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onDeleteElements).not.toHaveBeenCalled();
  });

  it('clears the selection even without a delete callback', async () => {
    const onSelectionCleared = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onSelectionCleared={onSelectionCleared}
      />,
    );

    screen.getByTestId('delete-surface').focus();
    await userEvent.setup().keyboard('{Delete}');

    expect(onSelectionCleared).toHaveBeenCalledTimes(1);
  });

  it('prevents the default action for Delete', () => {
    const onDeleteElements = jest.fn();
    render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByTestId('delete-surface'), { key: 'Delete' });

    expect(notPrevented).toBe(false);
    expect(onDeleteElements).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onDeleteElements = jest.fn();
    const { unmount } = render(
      <DeleteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDeleteElements={onDeleteElements}
      />,
    );

    const surface = screen.getByTestId('delete-surface');
    unmount();
    fireEvent.keyDown(surface, { key: 'Delete' });

    expect(onDeleteElements).not.toHaveBeenCalled();
  });
});
