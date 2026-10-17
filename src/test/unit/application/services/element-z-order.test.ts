import { bringElementsToFront, sendElementsToBack } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');

function createElement(id: string, x: number, zIndex = 0): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, 0),
    size: Size.create(100, 40),
    content: 'hello',
    zIndex,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function idsOf(elements: readonly Element[]): string[] {
  return elements.map((element) => element.id.value);
}

describe('bringElementsToFront', () => {
  it('moves the targeted element after every non-targeted element', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);
    const third = createElement('third', 20, 2);

    const result = bringElementsToFront([first, second, third], ['first']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['second', 'third', 'first']);
  });

  it('preserves the relative order of multiple targeted elements', () => {
    const a = createElement('a', 0, 0);
    const b = createElement('b', 10, 1);
    const c = createElement('c', 20, 2);

    const result = bringElementsToFront([a, b, c], ['a', 'c']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['b', 'a', 'c']);
  });

  it('keeps the whole board ordered when every element is targeted', () => {
    const a = createElement('a', 0, 0);
    const b = createElement('b', 10, 1);

    const result = bringElementsToFront([a, b], ['a', 'b']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['a', 'b']);
    expect(result.elements[0].zIndex).toBeLessThan(result.elements[1].zIndex);
  });

  it('returns a copy without mutating the input array or its elements', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);

    const result = bringElementsToFront([first, second], ['first']);

    expect(result.status).toBe('ok');
    expect(idsOf([first, second])).toEqual(['first', 'second']);
    expect(first.zIndex).toBe(0);
    expect(second.zIndex).toBe(1);

    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).not.toBe([first, second]);
  });

  it('returns the input unchanged when no ids match', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);

    const result = bringElementsToFront([first, second], []);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['first', 'second']);
  });
});

describe('sendElementsToBack', () => {
  it('moves the targeted element before every non-targeted element', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);
    const third = createElement('third', 20, 2);

    const result = sendElementsToBack([first, second, third], ['third']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['third', 'first', 'second']);
  });

  it('preserves the relative order of multiple targeted elements', () => {
    const a = createElement('a', 0, 0);
    const b = createElement('b', 10, 1);
    const c = createElement('c', 20, 2);

    const result = sendElementsToBack([a, b, c], ['a', 'c']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['a', 'c', 'b']);
  });

  it('assigns negative z-indexes so targeted elements sit below the board', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);

    const result = sendElementsToBack([first, second], ['second']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const moved = result.elements.find((element) => element.id.value === 'second');
    expect(moved?.zIndex).toBeLessThan(first.zIndex);
  });

  it('keeps the whole board ordered when every element is targeted', () => {
    const a = createElement('a', 0, 3);
    const b = createElement('b', 10, 4);

    const result = sendElementsToBack([a, b], ['a', 'b']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['a', 'b']);
    expect(result.elements[0].zIndex).toBeLessThan(result.elements[1].zIndex);
  });

  it('returns the input unchanged when no ids match', () => {
    const first = createElement('first', 0, 0);
    const second = createElement('second', 10, 1);

    const result = sendElementsToBack([first, second], ['nope']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(idsOf(result.elements)).toEqual(['first', 'second']);
  });
});
