import { applyElementWindow, createBoardWindowCommand } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildElement(
  id: string,
  overrides: {
    readonly x?: number;
    readonly updatedAt?: Date;
  } = {},
): Element {
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(overrides.x ?? 0, 20),
    size: Size.create(120, 80),
    content: `content-${id}`,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
  });
}

function positionX(element: Element | undefined): number {
  return element === undefined ? Number.NaN : element.position.x;
}

function findByX(elements: readonly Element[], id: string): Element | undefined {
  return elements.find((element) => element.id.value === id);
}

describe('applyElementWindow', () => {
  it('applies a forward modification over the previous version', () => {
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];

    const result = applyElementWindow(previous, previous, next);

    expect(positionX(findByX(result, 'el-1'))).toBe(40);
  });

  it('applies a forward creation', () => {
    const previous: readonly Element[] = [];
    const next = [buildElement('el-1')];

    const result = applyElementWindow([], previous, next);

    expect(result.map((element) => element.id.value)).toEqual(['el-1']);
  });

  it('applies a forward deletion', () => {
    const previous = [buildElement('el-1')];
    const next: readonly Element[] = [];

    const result = applyElementWindow(previous, previous, next);

    expect(result).toEqual([]);
  });

  it('does not override a strictly newer remote version of a modified element', () => {
    const previous = [buildElement('el-1', { x: 0, updatedAt: new Date('2024-01-01T00:00:00Z') })];
    const next = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];
    const remote = buildElement('el-1', { x: 90, updatedAt: new Date('2024-01-03T00:00:00Z') });

    const result = applyElementWindow([remote], previous, next);

    expect(result).toEqual([remote]);
    expect(positionX(findByX(result, 'el-1'))).toBe(90);
  });

  it('re-adds an element the window created when it is currently missing', () => {
    const previous: readonly Element[] = [];
    const next = [buildElement('el-1')];

    const result = applyElementWindow([], previous, next);

    expect(result.map((element) => element.id.value)).toEqual(['el-1']);
  });

  it('does not resurrect a remotely deleted element the window only modified', () => {
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];
    const current: readonly Element[] = [];

    const result = applyElementWindow(current, previous, next);

    expect(result).toBe(current);
  });

  it('leaves untouched elements intact and sorts deterministically', () => {
    const untouched = buildElement('kept');
    const previous = [untouched, buildElement('el-1', { x: 0 })];
    const next = [
      untouched,
      buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') }),
    ];

    const result = applyElementWindow(previous, previous, next);

    expect(result).toHaveLength(2);
    expect(findByX(result, 'kept')).toBe(untouched);
    expect(positionX(findByX(result, 'el-1'))).toBe(40);
  });

  it('returns the same board reference when the window is already applied', () => {
    const board = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [...board];

    expect(applyElementWindow(board, previous, next)).toBe(board);
  });

  it('returns the same board reference when there is nothing to apply', () => {
    const board = [buildElement('el-1')];

    expect(applyElementWindow(board, board, board)).toBe(board);
  });
});

describe('createBoardWindowCommand', () => {
  it('applies and reverts against the live board, preserving remote changes', () => {
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];
    let current: readonly Element[] = [next[0], buildElement('remote', { x: 10 })];

    const command = createBoardWindowCommand({
      readCurrent: () => current,
      previous,
      next,
      label: 'Move elements',
    });

    const undone = command.undo(current);
    expect(undone.status).toBe('ok');
    if (undone.status !== 'ok') {
      return;
    }

    current = undone.state;
    expect(positionX(findByX(current, 'el-1'))).toBe(0);
    expect(findByX(current, 'remote')).toBeDefined();

    const redone = command.execute(current);
    expect(redone.status).toBe('ok');
    if (redone.status !== 'ok') {
      return;
    }

    expect(positionX(findByX(redone.state, 'el-1'))).toBe(40);
    expect(findByX(redone.state, 'remote')).toBeDefined();
  });
});
