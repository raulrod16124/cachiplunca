import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { createTextElement, type Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import {
  useElementDuplicate,
  type UseElementDuplicateOptions,
} from '../../../../../presentation/canvas/hooks/use-element-duplicate';

interface DuplicateTestbenchProps extends UseElementDuplicateOptions {
  readonly children?: ReactNode;
}

function DuplicateTestbench({ children, ...options }: DuplicateTestbenchProps): ReactElement {
  const { ref } = useElementDuplicate(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="duplicate-surface"
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

function sequentialIds(): () => ElementId {
  let counter = 0;
  return () => {
    counter += 1;
    return ElementId.create(`copy-${counter}`);
  };
}

const FIRST_ITEM = createElement('first');
const SECOND_ITEM = createElement('second');

describe('useElementDuplicate', () => {
  it('does not call any handler without a keydown', () => {
    const onDuplicateElements = jest.fn();

    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('duplicates the selected elements on Ctrl+D', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('{Control>}d{/Control}');

    expect(onDuplicateElements).toHaveBeenCalledTimes(1);

    const [elements, duplicatedIds] = onDuplicateElements.mock.calls[0];
    expect(elements).toHaveLength(3);
    expect(duplicatedIds).toEqual(['copy-1']);
  });

  it('duplicates on Cmd+D', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('{Meta>}d{/Meta}');

    expect(onDuplicateElements).toHaveBeenCalledTimes(1);
  });

  it('duplicates every selected element in a multi selection', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first', 'second']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('{Control>}d{/Control}');

    const [elements, duplicatedIds] = onDuplicateElements.mock.calls[0];
    expect(elements).toHaveLength(4);
    expect(duplicatedIds).toEqual(['copy-1', 'copy-2']);
  });

  it('does nothing when the selection is empty', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={[]}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('{Control>}d{/Control}');

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('ignores a plain d without a modifier', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('d');

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('ignores Alt+D', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    const surface = screen.getByTestId('duplicate-surface');
    surface.focus();
    fireEvent.keyDown(surface, { key: 'd', ctrlKey: true, altKey: true });

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('ignores repeated keydowns', () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    const surface = screen.getByTestId('duplicate-surface');

    fireEvent.keyDown(surface, { key: 'd', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'd', ctrlKey: true, repeat: true });

    expect(onDuplicateElements).toHaveBeenCalledTimes(1);
  });

  it('ignores commands while an editable target is focused', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      >
        <input data-testid="editable" />
      </DuplicateTestbench>,
    );

    screen.getByTestId('editable').focus();
    await userEvent.setup().keyboard('{Control>}d{/Control}');

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
        disabled
      />,
    );

    screen.getByTestId('duplicate-surface').focus();
    await userEvent.setup().keyboard('{Control>}d{/Control}');

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('does nothing without a generateId dependency', () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByTestId('duplicate-surface'), {
      key: 'd',
      ctrlKey: true,
    });

    expect(notPrevented).toBe(true);
    expect(onDuplicateElements).not.toHaveBeenCalled();
  });

  it('does nothing without a duplicate callback', () => {
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByTestId('duplicate-surface'), {
      key: 'd',
      ctrlKey: true,
    });

    expect(notPrevented).toBe(true);
  });

  it('prevents the default action for a handled duplicate', () => {
    const onDuplicateElements = jest.fn();
    render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByTestId('duplicate-surface'), {
      key: 'd',
      ctrlKey: true,
    });

    expect(notPrevented).toBe(false);
    expect(onDuplicateElements).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onDuplicateElements = jest.fn();
    const { unmount } = render(
      <DuplicateTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onDuplicateElements={onDuplicateElements}
      />,
    );

    const surface = screen.getByTestId('duplicate-surface');
    unmount();
    fireEvent.keyDown(surface, { key: 'd', ctrlKey: true });

    expect(onDuplicateElements).not.toHaveBeenCalled();
  });
});
