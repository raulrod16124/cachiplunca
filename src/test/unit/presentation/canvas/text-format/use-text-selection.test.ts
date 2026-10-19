import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import {
  readTextSelection,
  readTextSelectionElementId,
  useTextSelection,
} from '../../../../../presentation/canvas/text-format/use-text-selection';
import type { TextSelectionSnapshot } from '../../../../../presentation/canvas/text-format/use-text-selection';

function selectNode(element: HTMLElement): void {
  const selection = window.getSelection();

  if (selection === null) {
    throw new Error('selection unavailable');
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}

function dispatchSelectionChange(): void {
  document.dispatchEvent(new Event('selectionchange'));
}

describe('readTextSelection', () => {
  afterEach(() => {
    clearSelection();
    document.body.innerHTML = '';
  });

  it('returns null when there is no selection', () => {
    expect(readTextSelection()).toBeNull();
  });

  it('returns a snapshot for a non-empty selection', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello world';
    document.body.append(scope);

    selectNode(scope);

    const snapshot = readTextSelection(scope);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.text).toBe('hello world');
  });

  it('returns null when the selection is outside the scope', () => {
    const inside = document.createElement('p');
    inside.textContent = 'inside';
    const outside = document.createElement('p');
    outside.textContent = 'outside';
    document.body.append(inside, outside);

    const selection = window.getSelection();

    if (selection === null) {
      throw new Error('selection unavailable');
    }

    const range = document.createRange();
    range.selectNodeContents(outside);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(readTextSelection(inside)).toBeNull();
  });

  it('returns null for a whitespace-only selection', () => {
    const scope = document.createElement('p');
    scope.textContent = '   ';
    document.body.append(scope);

    selectNode(scope);

    expect(readTextSelection(scope)).toBeNull();
  });

  it('returns null for a collapsed selection', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello';
    document.body.append(scope);

    const selection = window.getSelection();

    if (selection === null) {
      throw new Error('selection unavailable');
    }

    const range = document.createRange();
    range.setStart(scope.firstChild!, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(readTextSelection(scope)).toBeNull();
  });
});

describe('readTextSelectionElementId', () => {
  afterEach(() => {
    clearSelection();
    document.body.innerHTML = '';
  });

  it('returns the closest selectable element id', () => {
    const scope = document.createElement('div');
    const selectable = document.createElement('div');
    selectable.dataset.selectable = 'true';
    selectable.dataset.elementId = 'element-1';
    const content = document.createElement('p');
    content.textContent = 'hello world';
    selectable.append(content);
    scope.append(selectable);
    document.body.append(scope);

    selectNode(content);

    expect(readTextSelectionElementId(scope)).toBe('element-1');
  });

  it('returns null when the selection is outside the scope', () => {
    const scope = document.createElement('div');
    const outside = document.createElement('div');
    outside.dataset.selectable = 'true';
    outside.dataset.elementId = 'element-2';
    outside.textContent = 'outside';
    document.body.append(scope, outside);

    selectNode(outside);

    expect(readTextSelectionElementId(scope)).toBeNull();
  });

  it('returns null without a selection', () => {
    expect(readTextSelectionElementId()).toBeNull();
  });
});

describe('useTextSelection', () => {
  afterEach(() => {
    clearSelection();
    document.body.innerHTML = '';
  });

  it('reports null while inactive', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello';
    document.body.append(scope);

    const scopeRef = createRef<HTMLElement | null>();
    (scopeRef as { current: HTMLElement | null }).current = scope;

    const { result } = renderHook(() => useTextSelection({ active: false, scopeRef }));

    selectNode(scope);
    act(() => {
      dispatchSelectionChange();
    });

    expect(result.current.snapshot).toBeNull();
  });

  it('reports the selection when active and notifies the callback', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello';
    document.body.append(scope);

    const scopeRef = createRef<HTMLElement | null>();
    (scopeRef as { current: HTMLElement | null }).current = scope;

    const snapshots: (TextSelectionSnapshot | null)[] = [];

    const { result } = renderHook(() =>
      useTextSelection({
        active: true,
        scopeRef,
        onSelectionChange: (snapshot) => snapshots.push(snapshot),
      }),
    );

    selectNode(scope);
    act(() => {
      dispatchSelectionChange();
    });

    expect(result.current.snapshot?.text).toBe('hello');
    expect(snapshots[0]).toBeNull();
    expect(snapshots[1]).toEqual(result.current.snapshot);
  });

  it('reports null when the selection is cleared', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello';
    document.body.append(scope);

    const scopeRef = createRef<HTMLElement | null>();
    (scopeRef as { current: HTMLElement | null }).current = scope;

    const { result } = renderHook(() => useTextSelection({ active: true, scopeRef }));

    selectNode(scope);
    act(() => {
      dispatchSelectionChange();
    });

    expect(result.current.snapshot).not.toBeNull();

    clearSelection();
    act(() => {
      dispatchSelectionChange();
    });

    expect(result.current.snapshot).toBeNull();
  });

  it('detaches the listener when deactivated', () => {
    const scope = document.createElement('p');
    scope.textContent = 'hello';
    document.body.append(scope);

    const scopeRef = createRef<HTMLElement | null>();
    (scopeRef as { current: HTMLElement | null }).current = scope;

    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTextSelection({ active, scopeRef }),
      { initialProps: { active: true } },
    );

    selectNode(scope);
    act(() => {
      dispatchSelectionChange();
    });

    expect(result.current.snapshot).not.toBeNull();

    rerender({ active: false });

    expect(result.current.snapshot).toBeNull();
  });
});
