import {
  MIN_ELEMENT_SIZE,
  resizeElementByHandle,
  type ResizeHandleAnchor,
} from '../../../../application/services';
import { createTextElement, type Element, type TextElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const UPDATED_AT = new Date('2024-02-01T00:00:00Z');

function createElement(overrides: Partial<TextElement> = {}): TextElement {
  return createTextElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(100, 40),
    content: 'hello',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  });
}

function expectOk(
  element: Element,
  anchor: ResizeHandleAnchor,
  delta: Position,
  deps: { now?: () => Date; minSize?: number } = { now: () => UPDATED_AT },
): Element {
  const result = resizeElementByHandle(element, anchor, delta, deps);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
}

describe('resizeElementByHandle', () => {
  it('grows width and height from the bottom-right anchor keeping the origin', () => {
    const element = createElement();

    const resized = expectOk(element, 'bottom-right', Position.create(20, 10));

    expect(resized.position.equals(Position.create(10, 20))).toBe(true);
    expect(resized.size.equals(Size.create(120, 50))).toBe(true);
  });

  it('resizes the right edge without touching the height', () => {
    const resized = expectOk(createElement(), 'right', Position.create(25, 999));

    expect(resized.position.equals(Position.create(10, 20))).toBe(true);
    expect(resized.size.equals(Size.create(125, 40))).toBe(true);
  });

  it('resizes the bottom edge without touching the width', () => {
    const resized = expectOk(createElement(), 'bottom', Position.create(999, 30));

    expect(resized.position.equals(Position.create(10, 20))).toBe(true);
    expect(resized.size.equals(Size.create(100, 70))).toBe(true);
  });

  it('moves the origin when dragging a top-left anchor', () => {
    const resized = expectOk(createElement(), 'top-left', Position.create(5, 10));

    expect(resized.position.equals(Position.create(15, 30))).toBe(true);
    expect(resized.size.equals(Size.create(95, 30))).toBe(true);
  });

  it('moves the origin on the left edge only', () => {
    const resized = expectOk(createElement(), 'left', Position.create(10, 999));

    expect(resized.position.equals(Position.create(20, 20))).toBe(true);
    expect(resized.size.equals(Size.create(90, 40))).toBe(true);
  });

  it('moves the origin on the top edge only', () => {
    const resized = expectOk(createElement(), 'top', Position.create(999, 5));

    expect(resized.position.equals(Position.create(10, 25))).toBe(true);
    expect(resized.size.equals(Size.create(100, 35))).toBe(true);
  });

  it('keeps the opposite edge fixed for every anchor', () => {
    const element = createElement();
    const right = element.position.x + element.size.width;
    const bottom = element.position.y + element.size.height;

    const leftResized = expectOk(element, 'left', Position.create(30, 0));
    expect(leftResized.position.x + leftResized.size.width).toBe(right);

    const topResized = expectOk(element, 'top', Position.create(0, 15));
    expect(topResized.position.y + topResized.size.height).toBe(bottom);

    const topLeftResized = expectOk(element, 'top-left', Position.create(30, 15));
    expect(topLeftResized.position.x + topLeftResized.size.width).toBe(right);
    expect(topLeftResized.position.y + topLeftResized.size.height).toBe(bottom);
  });

  it('clamps to the minimum size instead of producing negative dimensions', () => {
    const resized = expectOk(createElement(), 'bottom-right', Position.create(-500, -500));

    expect(resized.size.equals(Size.create(MIN_ELEMENT_SIZE, MIN_ELEMENT_SIZE))).toBe(true);
    expect(resized.position.equals(Position.create(10, 20))).toBe(true);
  });

  it('honours a custom minimum size', () => {
    const resized = expectOk(createElement(), 'bottom-right', Position.create(-500, -500), {
      now: () => UPDATED_AT,
      minSize: 12,
    });

    expect(resized.size.equals(Size.create(12, 12))).toBe(true);
  });

  it('keeps the right edge fixed when a left drag crosses the minimum size', () => {
    const resized = expectOk(createElement(), 'left', Position.create(500, 0));

    expect(resized.size.equals(Size.create(MIN_ELEMENT_SIZE, 40))).toBe(true);
    expect(resized.position.equals(Position.create(109, 20))).toBe(true);
  });

  it('stamps updatedAt from the injected clock while preserving createdAt', () => {
    const resized = expectOk(createElement(), 'bottom-right', Position.create(5, 5));

    expect(resized.updatedAt).toBe(UPDATED_AT);
    expect(resized.createdAt).toBe(CREATED_AT);
  });

  it('preserves identity and type', () => {
    const element = createElement();

    const resized = expectOk(element, 'bottom-right', Position.create(5, 5));

    expect(resized.id.equals(element.id)).toBe(true);
    expect(resized.type).toBe('text');
  });

  it('does not mutate the input element', () => {
    const element = createElement();

    resizeElementByHandle(element, 'bottom-right', Position.create(5, 5), {
      now: () => UPDATED_AT,
    });

    expect(element.position.equals(Position.create(10, 20))).toBe(true);
    expect(element.size.equals(Size.create(100, 40))).toBe(true);
  });

  it('returns a validation error instead of throwing for an invalid delta', () => {
    const result = resizeElementByHandle(createElement(), 'bottom-right', {
      x: NaN,
      y: 0,
    } as Position);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });
});
