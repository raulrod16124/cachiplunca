import { deleteElements } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');

function createElement(id: string, x: number, y: number): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(100, 40),
    content: 'hello',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

describe('deleteElements', () => {
  it('removes the targeted element and preserves the rest in order', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);
    const third = createElement('third', 300, 400);

    const result = deleteElements([first, second, third], ['first', 'third']);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toBe(second);
  });

  it('removes a single targeted element', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);

    const result = deleteElements([first, second], ['second']);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements.map((element) => element.id.value)).toEqual(['first']);
    }
  });

  it('returns every element untouched when no id matches', () => {
    const first = createElement('first', 10, 20);

    const result = deleteElements([first], ['missing']);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toBe(first);
    }
  });

  it('removes nothing when the id list is empty', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);

    const result = deleteElements([first, second], []);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toHaveLength(2);
      expect(result.elements).not.toBe([first, second]);
    }
  });

  it('does not mutate the input elements', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);
    const elements = [first, second];

    deleteElements(elements, ['first']);

    expect(elements).toHaveLength(2);
    expect(elements[0]).toBe(first);
    expect(elements[1]).toBe(second);
  });

  it('returns a validation error instead of throwing for an invalid element', () => {
    const invalid: Element = {
      ...createElement('first', 10, 20),
      createdAt: new Date('2024-05-01T00:00:00Z'),
    };

    const result = deleteElements([invalid], ['first']);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });
});
