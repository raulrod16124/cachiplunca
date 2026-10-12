import { moveElementsByDelta, resolveMoveIds } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const UPDATED_AT = new Date('2024-02-01T00:00:00Z');

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

describe('resolveMoveIds', () => {
  it('returns only the pressed id when it is not selected', () => {
    expect(resolveMoveIds('b', ['a'])).toEqual(['b']);
  });

  it('returns the whole selection when the pressed id belongs to it', () => {
    expect(resolveMoveIds('a', ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('returns the pressed id when nothing is selected', () => {
    expect(resolveMoveIds('a', [])).toEqual(['a']);
  });

  it('does not return the same array instance as the selection', () => {
    const selected = ['a', 'b'];

    expect(resolveMoveIds('a', selected)).not.toBe(selected);
  });
});

describe('moveElementsByDelta', () => {
  it('translates the targeted elements by the delta and preserves the rest', () => {
    const first = createElement('first', 10, 20);
    const second = createElement('second', 100, 200);
    const third = createElement('third', 300, 400);

    const result = moveElementsByDelta(
      [first, second, third],
      ['first', 'third'],
      Position.create(5, -7),
      {
        now: () => UPDATED_AT,
      },
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(3);
    expect(result.elements[0]?.position.equals(Position.create(15, 13))).toBe(true);
    expect(result.elements[1]).toBe(second);
    expect(result.elements[2]?.position.equals(Position.create(305, 393))).toBe(true);
  });

  it('returns the elements untouched when no id matches', () => {
    const first = createElement('first', 10, 20);

    const result = moveElementsByDelta([first], ['missing'], Position.create(5, 5));

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements[0]).toBe(first);
    }
  });

  it('is idempotent when re-applied from the same baseline with the same cumulative delta', () => {
    const baseline = createElement('first', 10, 20);
    const delta = Position.create(5, 5);

    const first = moveElementsByDelta([baseline], ['first'], delta, { now: () => UPDATED_AT });
    const second = moveElementsByDelta([baseline], ['first'], delta, { now: () => UPDATED_AT });

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.elements[0]?.position.equals(Position.create(15, 25))).toBe(true);
      expect(first.elements[0]?.position.equals(second.elements[0]!.position)).toBe(true);
    }
  });

  it('stamps updatedAt from the injected clock while preserving createdAt', () => {
    const element = createElement('first', 10, 20);

    const result = moveElementsByDelta([element], ['first'], Position.create(1, 1), {
      now: () => UPDATED_AT,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements[0]?.updatedAt).toBe(UPDATED_AT);
      expect(result.elements[0]?.createdAt).toBe(CREATED_AT);
    }
  });

  it('does not mutate the input elements', () => {
    const element = createElement('first', 10, 20);
    const elements = [element];

    moveElementsByDelta(elements, ['first'], Position.create(5, 5), { now: () => UPDATED_AT });

    expect(elements).toHaveLength(1);
    expect(element.position.equals(Position.create(10, 20))).toBe(true);
  });

  it('returns a validation error instead of throwing for an invalid delta', () => {
    const element = createElement('first', 10, 20);
    const invalidDelta = { x: NaN, y: 0 } as Position;

    const result = moveElementsByDelta([element], ['first'], invalidDelta);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does nothing when the id list is empty', () => {
    const element = createElement('first', 10, 20);

    const result = moveElementsByDelta([element], [], Position.create(5, 5));

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements[0]).toBe(element);
    }
  });
});
