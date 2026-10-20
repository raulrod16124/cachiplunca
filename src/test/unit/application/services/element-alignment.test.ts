import {
  alignElements,
  distributeElements,
  type AlignmentMode,
} from '../../../../application/services';
import {
  createConnectorElement,
  createTextElement,
  type Element,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const UPDATED_AT = new Date('2024-02-01T00:00:00Z');

function createElement(id: string, x: number, y: number, width = 100, height = 40): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: 'hello',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function createConnector(id: string, x: number, y: number): Element {
  return createConnectorElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(100, 40),
    sourcePoint: Position.create(0, 0),
    targetPoint: Position.create(100, 40),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function positioned(elements: readonly Element[], id: string): Position {
  const element = elements.find((candidate) => candidate.id.value === id);

  if (element === undefined) {
    throw new Error(`Missing element ${id}`);
  }

  return element.position;
}

function expectOk(result: ReturnType<typeof alignElements>): readonly Element[] {
  expect(result.status).toBe('ok');

  if (result.status !== 'ok') {
    throw new Error('Expected arrange operation to succeed');
  }

  return result.elements;
}

describe('alignElements', () => {
  const elements = [
    createElement('a', 10, 10),
    createElement('b', 200, 100),
    createElement('c', 300, 300),
  ];

  const cases: readonly {
    readonly mode: AlignmentMode;
    readonly expected: readonly [number, number, number, number, number, number];
  }[] = [
    { mode: 'left', expected: [10, 10, 10, 100, 10, 300] },
    { mode: 'center-horizontal', expected: [155, 10, 155, 100, 155, 300] },
    { mode: 'right', expected: [300, 10, 300, 100, 300, 300] },
    { mode: 'top', expected: [10, 10, 200, 10, 300, 10] },
    { mode: 'center-vertical', expected: [10, 155, 200, 155, 300, 155] },
    { mode: 'bottom', expected: [10, 300, 200, 300, 300, 300] },
  ];

  it.each(cases)('aligns the selection using $mode', ({ mode, expected }) => {
    const result = alignElements(elements, ['a', 'b', 'c'], mode, {
      now: () => UPDATED_AT,
    });
    const arranged = expectOk(result);

    expect(positioned(arranged, 'a').equals(Position.create(expected[0], expected[1]))).toBe(true);
    expect(positioned(arranged, 'b').equals(Position.create(expected[2], expected[3]))).toBe(true);
    expect(positioned(arranged, 'c').equals(Position.create(expected[4], expected[5]))).toBe(true);
  });

  it('never changes sizes', () => {
    const arranged = expectOk(alignElements(elements, ['a', 'b', 'c'], 'left'));

    expect(arranged.map((element) => element.size.width)).toEqual([100, 100, 100]);
    expect(arranged.map((element) => element.size.height)).toEqual([40, 40, 40]);
  });

  it('requires at least two arrangeable elements', () => {
    const result = alignElements(elements, ['a'], 'left');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toBe(elements);
    }
  });

  it('excludes connectors from alignment', () => {
    const first = createElement('a', 10, 10);
    const second = createElement('b', 200, 100);
    const connector = createConnector('connector', 50, 50);
    const source = [first, second, connector];

    const arranged = expectOk(
      alignElements(source, ['a', 'b', 'connector'], 'left', { now: () => UPDATED_AT }),
    );

    expect(positioned(arranged, 'a').x).toBe(10);
    expect(positioned(arranged, 'b').x).toBe(10);
    expect(arranged.find((element) => element.id.value === 'connector')).toBe(connector);
  });

  it('does nothing when the selection only contains connectors', () => {
    const source = [createConnector('one', 10, 10), createConnector('two', 200, 100)];
    const result = alignElements(source, ['one', 'two'], 'left');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toBe(source);
    }
  });

  it('returns the same reference when the elements are already aligned', () => {
    const source = [createElement('a', 10, 10), createElement('b', 10, 100)];
    const result = alignElements(source, ['a', 'b'], 'left');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toBe(source);
    }
  });

  it('stamps updatedAt only on moved elements and preserves createdAt', () => {
    const source = [createElement('a', 10, 10), createElement('b', 200, 100)];
    const arranged = expectOk(alignElements(source, ['a', 'b'], 'left', { now: () => UPDATED_AT }));

    expect(arranged[0]?.updatedAt).toBe(CREATED_AT);
    expect(arranged[1]?.updatedAt).toBe(UPDATED_AT);
    expect(arranged[1]?.createdAt).toBe(CREATED_AT);
  });

  it('does not mutate the input elements', () => {
    const source = [createElement('a', 10, 10), createElement('b', 200, 100)];

    alignElements(source, ['a', 'b'], 'left', { now: () => UPDATED_AT });

    expect(positioned(source, 'b').equals(Position.create(200, 100))).toBe(true);
  });
});

describe('distributeElements', () => {
  it('distributes horizontal gaps and keeps the outer elements fixed', () => {
    const first = createElement('a', 0, 0, 100, 40);
    const middle = createElement('b', 40, 0, 100, 40);
    const last = createElement('c', 400, 0, 100, 40);

    const arranged = expectOk(
      distributeElements([first, middle, last], ['a', 'b', 'c'], 'horizontal', {
        now: () => UPDATED_AT,
      }),
    );

    expect(positioned(arranged, 'a').x).toBe(0);
    expect(positioned(arranged, 'b').x).toBe(200);
    expect(positioned(arranged, 'c').x).toBe(400);
  });

  it('distributes vertical gaps and keeps the outer elements fixed', () => {
    const first = createElement('a', 0, 0, 100, 40);
    const middle = createElement('b', 0, 40, 100, 40);
    const last = createElement('c', 0, 400, 100, 40);

    const arranged = expectOk(
      distributeElements([first, middle, last], ['a', 'b', 'c'], 'vertical', {
        now: () => UPDATED_AT,
      }),
    );

    expect(positioned(arranged, 'a').y).toBe(0);
    expect(positioned(arranged, 'b').y).toBe(200);
    expect(positioned(arranged, 'c').y).toBe(400);
  });

  it('sorts by position before distributing', () => {
    const first = createElement('a', 0, 0, 100, 40);
    const middle = createElement('b', 40, 0, 100, 40);
    const last = createElement('c', 400, 0, 100, 40);

    const arranged = expectOk(
      distributeElements([last, middle, first], ['a', 'b', 'c'], 'horizontal', {
        now: () => UPDATED_AT,
      }),
    );

    expect(positioned(arranged, 'b').x).toBe(200);
  });

  it('allows negative gaps when the elements overlap the available span', () => {
    const first = createElement('a', 0, 0, 100, 40);
    const middle = createElement('b', 0, 0, 100, 40);
    const last = createElement('c', 10, 0, 100, 40);

    const arranged = expectOk(
      distributeElements([first, middle, last], ['a', 'b', 'c'], 'horizontal', {
        now: () => UPDATED_AT,
      }),
    );

    expect(positioned(arranged, 'b').x).toBe(5);
  });

  it('requires at least three arrangeable elements', () => {
    const source = [createElement('a', 0, 0), createElement('b', 200, 0)];
    const result = distributeElements(source, ['a', 'b'], 'horizontal');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toBe(source);
    }
  });

  it('excludes connectors from distribution', () => {
    const first = createElement('a', 0, 0);
    const middle = createElement('b', 0, 0);
    const last = createElement('c', 400, 0);
    const connector = createConnector('connector', 50, 50);
    const source = [first, middle, last, connector];

    const arranged = expectOk(
      distributeElements(source, ['a', 'b', 'c', 'connector'], 'horizontal', {
        now: () => UPDATED_AT,
      }),
    );

    expect(positioned(arranged, 'b').x).toBe(200);
    expect(arranged.find((element) => element.id.value === 'connector')).toBe(connector);
  });

  it('returns the same reference when the elements are already distributed', () => {
    const source = [
      createElement('a', 0, 0, 100, 40),
      createElement('b', 200, 0, 100, 40),
      createElement('c', 400, 0, 100, 40),
    ];
    const result = distributeElements(source, ['a', 'b', 'c'], 'horizontal');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.elements).toBe(source);
    }
  });

  it('never changes sizes', () => {
    const source = [
      createElement('a', 0, 0, 100, 40),
      createElement('b', 40, 0, 50, 20),
      createElement('c', 400, 0, 80, 60),
    ];
    const arranged = expectOk(distributeElements(source, ['a', 'b', 'c'], 'horizontal'));

    expect(arranged.map((element) => element.size.width)).toEqual([100, 50, 80]);
    expect(arranged.map((element) => element.size.height)).toEqual([40, 20, 60]);
  });
});
