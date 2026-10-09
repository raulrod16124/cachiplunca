import { Bounds, Position } from '../../../../domain/shared';
import { findSelectableAt } from '../../../../application/services/canvas-hit-test';
import type { SelectableItem } from '../../../../application/services/canvas-hit-test';

const FIRST: SelectableItem = { id: 'first', bounds: Bounds.fromXYWH(0, 0, 100, 100) };
const SECOND: SelectableItem = { id: 'second', bounds: Bounds.fromXYWH(50, 50, 100, 100) };

describe('findSelectableAt', () => {
  it('returns null when there are no items', () => {
    expect(findSelectableAt([], Position.create(10, 10))).toBeNull();
  });

  it('returns null when the point is outside every item', () => {
    expect(findSelectableAt([FIRST], Position.create(200, 200))).toBeNull();
  });

  it('returns the id of the item containing the point', () => {
    expect(findSelectableAt([FIRST, SECOND], Position.create(25, 25))).toBe('first');
  });

  it('treats the item edges as hits', () => {
    expect(findSelectableAt([FIRST], Position.create(0, 0))).toBe('first');
    expect(findSelectableAt([FIRST], Position.create(100, 100))).toBe('first');
  });

  it('returns the topmost item when bounds overlap', () => {
    expect(findSelectableAt([FIRST, SECOND], Position.create(75, 75))).toBe('second');
    expect(findSelectableAt([SECOND, FIRST], Position.create(75, 75))).toBe('first');
  });
});
