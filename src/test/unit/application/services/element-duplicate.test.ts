import { DEFAULT_DUPLICATE_OFFSET, duplicateElements } from '../../../../application/services';
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

function sequentialIds(): () => ElementId {
  let counter = 0;
  return () => {
    counter += 1;
    return ElementId.create(`copy-${counter}`);
  };
}

describe('duplicateElements', () => {
  it('duplicates the targeted element with a new id and offset position', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);

    const result = duplicateElements([first, second], ['first'], {
      generateId: sequentialIds(),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(3);
    expect(result.elements[0]).toBe(first);
    expect(result.elements[1]).toBe(second);

    const copy = result.elements[2];
    expect(copy.id.value).toBe('copy-1');
    expect(copy.position.x).toBe(first.position.x + DEFAULT_DUPLICATE_OFFSET.x);
    expect(copy.position.y).toBe(first.position.y + DEFAULT_DUPLICATE_OFFSET.y);
    expect(result.duplicatedIds).toEqual(['copy-1']);
  });

  it('duplicates every targeted element preserving source order', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);
    const third = createElement('third', 300, 400);

    const result = duplicateElements([first, second, third], ['first', 'third'], {
      generateId: sequentialIds(),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements.map((element) => element.id.value)).toEqual([
      'first',
      'second',
      'third',
      'copy-1',
      'copy-2',
    ]);
    expect(result.duplicatedIds).toEqual(['copy-1', 'copy-2']);
  });

  it('applies a custom offset when provided', () => {
    const first = createElement('first', 10, 20);

    const result = duplicateElements([first], ['first'], {
      generateId: sequentialIds(),
      offset: Position.create(5, -5),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const copy = result.elements[1];
    expect(copy.position.x).toBe(15);
    expect(copy.position.y).toBe(15);
  });

  it('returns every element untouched when no id matches', () => {
    const first = createElement('first', 10, 20);

    const result = duplicateElements([first], ['missing'], { generateId: sequentialIds() });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toBe(first);
    expect(result.duplicatedIds).toEqual([]);
  });

  it('duplicates nothing when the id list is empty', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);

    const result = duplicateElements([first, second], [], { generateId: sequentialIds() });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(2);
    expect(result.elements).not.toBe([first, second]);
    expect(result.duplicatedIds).toEqual([]);
  });

  it('does not mutate the input elements', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);
    const elements = [first, second];

    duplicateElements(elements, ['first'], { generateId: sequentialIds() });

    expect(elements).toHaveLength(2);
    expect(elements[0]).toBe(first);
    expect(elements[1]).toBe(second);
  });

  it('generates fresh timestamps from the injected clock', () => {
    const first = createElement('first', 10, 20);
    const now = new Date('2025-06-01T12:00:00Z');

    const result = duplicateElements([first], ['first'], {
      generateId: sequentialIds(),
      now: () => now,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const copy = result.elements[1];
    expect(copy.createdAt).toEqual(now);
    expect(copy.updatedAt).toEqual(now);
  });

  it('produces distinct copies across invocations with the same deps', () => {
    const first = createElement('first', 10, 20);
    const generateId = sequentialIds();

    const firstRun = duplicateElements([first], ['first'], { generateId });
    const secondRun = duplicateElements([first], ['first'], { generateId });

    expect(firstRun.status).toBe('ok');
    expect(secondRun.status).toBe('ok');
    if (firstRun.status !== 'ok' || secondRun.status !== 'ok') {
      return;
    }

    expect(firstRun.duplicatedIds[0]).not.toBe(secondRun.duplicatedIds[0]);
  });

  it('returns a validation error instead of throwing for an invalid source element', () => {
    const invalid: Element = {
      ...createElement('first', 10, 20),
      createdAt: new Date('2024-05-01T00:00:00Z'),
    };

    const result = duplicateElements([invalid], ['first'], { generateId: sequentialIds() });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });
});
