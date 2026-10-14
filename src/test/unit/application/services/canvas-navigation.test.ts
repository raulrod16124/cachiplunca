import {
  findNextSelectable,
  resolveNavigationKey,
} from '../../../../application/services/canvas-navigation';
import type { SelectableItem } from '../../../../application/services/canvas-hit-test';
import { Bounds } from '../../../../domain/shared';

function item(id: string, x: number, y: number, width = 10, height = 10): SelectableItem {
  return { id, bounds: Bounds.fromXYWH(x, y, width, height) };
}

const NO_MODIFIERS = {
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
} as const;

describe('resolveNavigationKey', () => {
  it('resolves the four arrow keys without modifiers', () => {
    expect(resolveNavigationKey({ key: 'ArrowUp', ...NO_MODIFIERS })).toEqual({
      direction: 'up',
      additive: false,
    });
    expect(resolveNavigationKey({ key: 'ArrowDown', ...NO_MODIFIERS })).toEqual({
      direction: 'down',
      additive: false,
    });
    expect(resolveNavigationKey({ key: 'ArrowLeft', ...NO_MODIFIERS })).toEqual({
      direction: 'left',
      additive: false,
    });
    expect(resolveNavigationKey({ key: 'ArrowRight', ...NO_MODIFIERS })).toEqual({
      direction: 'right',
      additive: false,
    });
  });

  it('marks shift as additive', () => {
    expect(resolveNavigationKey({ key: 'ArrowUp', ...NO_MODIFIERS, shiftKey: true })).toEqual({
      direction: 'up',
      additive: true,
    });
  });

  it('ignores arrows combined with ctrl, meta or alt', () => {
    expect(resolveNavigationKey({ key: 'ArrowRight', ...NO_MODIFIERS, ctrlKey: true })).toBeNull();
    expect(resolveNavigationKey({ key: 'ArrowRight', ...NO_MODIFIERS, metaKey: true })).toBeNull();
    expect(resolveNavigationKey({ key: 'ArrowRight', ...NO_MODIFIERS, altKey: true })).toBeNull();
  });

  it('returns null for non-arrow keys', () => {
    expect(resolveNavigationKey({ key: 'a', ...NO_MODIFIERS })).toBeNull();
    expect(resolveNavigationKey({ key: 'Backspace', ...NO_MODIFIERS })).toBeNull();
    expect(resolveNavigationKey({ key: 'Enter', ...NO_MODIFIERS })).toBeNull();
  });
});

describe('findNextSelectable', () => {
  const A = item('a', 0, 0);
  const B = item('b', 100, 0);
  const C = item('c', 0, 100);
  const D = item('d', 100, 100);

  it('returns null with no items', () => {
    expect(findNextSelectable([], 'a', 'right')).toBeNull();
  });

  it('returns the first item when there is no current selection', () => {
    expect(findNextSelectable([A, B, C], null, 'right')).toBe('a');
  });

  it('returns the first item when the current id is unknown', () => {
    expect(findNextSelectable([A, B, C], 'missing', 'right')).toBe('a');
  });

  it('picks the aligned neighbour in the requested direction', () => {
    expect(findNextSelectable([A, B, C, D], 'a', 'right')).toBe('b');
    expect(findNextSelectable([A, B, C, D], 'a', 'down')).toBe('c');
    expect(findNextSelectable([A, B, C, D], 'd', 'left')).toBe('c');
    expect(findNextSelectable([A, B, C, D], 'd', 'up')).toBe('b');
  });

  it('prefers a closer aligned candidate over a lateral one', () => {
    const near = item('near', 50, 0);
    const lateral = item('lateral', 40, 40);

    expect(findNextSelectable([A, near, lateral], 'a', 'right')).toBe('near');
  });

  it('returns null when there is no candidate in the direction', () => {
    expect(findNextSelectable([A, B], 'b', 'right')).toBeNull();
    expect(findNextSelectable([A, C], 'a', 'up')).toBeNull();
  });

  it('breaks ties deterministically by input order', () => {
    const first = item('first', 100, 0);
    const second = item('second', 100, 0);

    expect(findNextSelectable([A, first, second], 'a', 'right')).toBe('first');
  });
});
