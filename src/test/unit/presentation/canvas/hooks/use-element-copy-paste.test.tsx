import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { createTextElement, type Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import {
  useElementCopyPaste,
  type UseElementCopyPasteOptions,
} from '../../../../../presentation/canvas/hooks/use-element-copy-paste';

interface CopyPasteTestbenchProps extends UseElementCopyPasteOptions {
  readonly children?: ReactNode;
}

function CopyPasteTestbench({ children, ...options }: CopyPasteTestbenchProps): ReactElement {
  const { ref } = useElementCopyPaste(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="copy-paste-surface"
      role="application"
      aria-label="Canvas"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

function clipboardData(files: readonly File[] = [], text = '') {
  return {
    files,
    getData: (format: string) => (format === 'text/plain' ? text : ''),
  };
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
    return ElementId.create(`pasted-${counter}`);
  };
}

const FIRST_ITEM = createElement('first');
const SECOND_ITEM = createElement('second');

describe('useElementCopyPaste', () => {
  it('does not call any handler without a keydown or paste', () => {
    const onPasteElements = jest.fn();

    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('copies the selection and pastes a new element on Ctrl+C then paste', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(onPasteElements).toHaveBeenCalledTimes(1);

    const [elements, pastedIds] = onPasteElements.mock.calls[0];
    expect(elements).toHaveLength(3);
    expect(pastedIds).toEqual(['pasted-1']);

    const pasted = elements[2];
    expect(pasted.id.value).toBe('pasted-1');
    expect(pasted.position.x).toBe(26);
    expect(pasted.position.y).toBe(36);
  });

  it('pastes a new element on Cmd+V after copying on Cmd+C', async () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    surface.focus();
    const user = userEvent.setup();
    await user.keyboard('{Meta>}c{/Meta}');
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(onPasteElements).toHaveBeenCalledTimes(1);
  });

  it('pastes every copied element in a multi selection', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM, SECOND_ITEM]}
        selectedIds={['first', 'second']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    const [elements, pastedIds] = onPasteElements.mock.calls[0];
    expect(elements).toHaveLength(4);
    expect(pastedIds).toEqual(['pasted-1', 'pasted-2']);
  });

  it('pastes plain text from the system clipboard', () => {
    const onPasteText = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onPasteText={onPasteText}
      />,
    );

    const notPrevented = fireEvent.paste(screen.getByTestId('copy-paste-surface'), {
      clipboardData: clipboardData([], 'Hello\nWorld'),
    });

    expect(notPrevented).toBe(false);
    expect(onPasteText).toHaveBeenCalledTimes(1);
    expect(onPasteText).toHaveBeenCalledWith('Hello\nWorld');
  });

  it('pastes an image from the system clipboard', () => {
    const onPasteImage = jest.fn();
    const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onPasteImage={onPasteImage}
      />,
    );

    const notPrevented = fireEvent.paste(screen.getByTestId('copy-paste-surface'), {
      clipboardData: clipboardData([file]),
    });

    expect(notPrevented).toBe(false);
    expect(onPasteImage).toHaveBeenCalledTimes(1);
    expect(onPasteImage).toHaveBeenCalledWith(file);
  });

  it('prefers external text over internally copied elements', () => {
    const onPasteElements = jest.fn();
    const onPasteText = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
        onPasteText={onPasteText}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData([], 'external') });

    expect(onPasteText).toHaveBeenCalledWith('external');
    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('prefers an external image over internally copied elements', () => {
    const onPasteElements = jest.fn();
    const onPasteImage = jest.fn();
    const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
        onPasteImage={onPasteImage}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData([file]) });

    expect(onPasteImage).toHaveBeenCalledWith(file);
    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('does nothing on paste when nothing was copied', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const notPrevented = fireEvent.paste(screen.getByTestId('copy-paste-surface'), {
      clipboardData: clipboardData(),
    });

    expect(notPrevented).toBe(true);
    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('does not copy when the selection is empty', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={[]}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('ignores a plain v without a modifier', async () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'v' });

    await Promise.resolve();

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('ignores Alt+C and Alt+V', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true, altKey: true });
    fireEvent.keyDown(surface, { key: 'v', ctrlKey: true, altKey: true });

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('ignores repeated paste keydowns and pastes once from the fallback', async () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'v', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'v', ctrlKey: true, repeat: true });

    await Promise.resolve();

    expect(onPasteElements).toHaveBeenCalledTimes(1);
  });

  it('keeps the keydown fallback when the paste event does not fire', async () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(surface, { key: 'v', ctrlKey: true });

    await Promise.resolve();

    expect(onPasteElements).toHaveBeenCalledTimes(1);
  });

  it('does not intercept paste inside editable targets', () => {
    const onPasteText = jest.fn();
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
        onPasteText={onPasteText}
      >
        <input data-testid="editable" />
        <div data-testid="rich-editable" contentEditable="true" />
      </CopyPasteTestbench>,
    );

    for (const testId of ['editable', 'rich-editable']) {
      const notPrevented = fireEvent.paste(screen.getByTestId(testId), {
        clipboardData: clipboardData([], 'hello'),
      });
      expect(notPrevented).toBe(true);
    }

    expect(onPasteText).not.toHaveBeenCalled();
    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('ignores copy commands while an editable target is focused', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      >
        <input data-testid="editable" />
      </CopyPasteTestbench>,
    );

    const editable = screen.getByTestId('editable');
    editable.focus();
    fireEvent.keyDown(editable, { key: 'c', ctrlKey: true });
    fireEvent.paste(editable, { clipboardData: clipboardData() });

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
        disabled
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('does nothing without a generateId dependency', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    const notPrevented = fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(notPrevented).toBe(true);
    expect(onPasteElements).not.toHaveBeenCalled();
  });

  it('does nothing without a paste callback', () => {
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    const notPrevented = fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(notPrevented).toBe(true);
  });

  it('prevents the default action for a handled copy and paste', () => {
    const onPasteElements = jest.fn();
    render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    const copyNotPrevented = fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    const pasteNotPrevented = fireEvent.paste(surface, {
      clipboardData: clipboardData(),
    });

    expect(copyNotPrevented).toBe(false);
    expect(pasteNotPrevented).toBe(false);
    expect(onPasteElements).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onPasteElements = jest.fn();
    const { unmount } = render(
      <CopyPasteTestbench
        elements={[FIRST_ITEM]}
        selectedIds={['first']}
        generateId={sequentialIds()}
        onPasteElements={onPasteElements}
      />,
    );

    const surface = screen.getByTestId('copy-paste-surface');
    fireEvent.keyDown(surface, { key: 'c', ctrlKey: true });
    unmount();
    fireEvent.paste(surface, { clipboardData: clipboardData() });

    expect(onPasteElements).not.toHaveBeenCalled();
  });
});
