import { rollbackFailedMutation } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildElement(
  id: string,
  overrides: {
    readonly x?: number;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
  } = {},
): Element {
  const createdAt = overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z');
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

function positionX(element: Element): number {
  return element.position.x;
}

describe('rollbackFailedMutation', () => {
  it('restores a modified element to its previous version', () => {
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [buildElement('el-1', { x: 40 })];
    const current = [buildElement('el-1', { x: 40 })];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toHaveLength(1);
    expect(positionX(result[0])).toBe(0);
  });

  it('removes an optimistically created element that failed to persist', () => {
    const previous: readonly Element[] = [];
    const next = [buildElement('el-1')];
    const current = [buildElement('el-1')];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toEqual([]);
  });

  it('re-adds an optimistically deleted element that failed to persist', () => {
    const previous = [buildElement('el-1')];
    const next: readonly Element[] = [];
    const current: readonly Element[] = [];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toEqual(previous);
  });

  it('keeps a modified element superseded by a strictly newer remote version', () => {
    const previous = [buildElement('el-1', { x: 0, updatedAt: new Date('2024-01-01T00:00:00Z') })];
    const next = [buildElement('el-1', { x: 40, updatedAt: new Date('2024-01-02T00:00:00Z') })];
    const remote = buildElement('el-1', { x: 90, updatedAt: new Date('2024-01-03T00:00:00Z') });
    const current = [remote];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toEqual([remote]);
    expect(positionX(result[0])).toBe(90);
  });

  it('keeps an optimistically created element superseded by a strictly newer remote version', () => {
    const previous: readonly Element[] = [];
    const next = [buildElement('el-1', { updatedAt: new Date('2024-01-02T00:00:00Z') })];
    const remote = buildElement('el-1', { updatedAt: new Date('2024-01-03T00:00:00Z') });
    const current = [remote];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toEqual([remote]);
  });

  it('does not resurrect an element removed remotely while the local change failed', () => {
    const previous = [buildElement('el-1', { x: 0 })];
    const next = [buildElement('el-1', { x: 40 })];
    const current: readonly Element[] = [];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toBe(current);
  });

  it('keeps a deleted element that was re-created remotely with a newer version', () => {
    const previous = [buildElement('el-1')];
    const next: readonly Element[] = [];
    const remote = buildElement('el-1', { updatedAt: new Date('2024-01-05T00:00:00Z') });
    const current = [remote];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toBe(current);
  });

  it('leaves untouched elements intact', () => {
    const untouched = buildElement('kept');
    const previous = [untouched, buildElement('el-1', { x: 0 })];
    const next = [untouched, buildElement('el-1', { x: 40 })];
    const current = [untouched, buildElement('el-1', { x: 40 })];

    const result = rollbackFailedMutation(current, previous, next);

    expect(result).toHaveLength(2);
    expect(result.find((element) => element.id.value === 'kept')).toBe(untouched);
    expect(positionX(result.find((element) => element.id.value === 'el-1') as Element)).toBe(0);
  });

  it('handles a mixed create, move and delete window', () => {
    const previous = [buildElement('moved', { x: 0 }), buildElement('deleted')];
    const next = [buildElement('moved', { x: 40 }), buildElement('created')];
    const current = [buildElement('moved', { x: 40 }), buildElement('created')];

    const result = rollbackFailedMutation(current, previous, next);

    const ids = result.map((element) => element.id.value).sort();
    expect(ids).toEqual(['deleted', 'moved']);
    expect(positionX(result.find((element) => element.id.value === 'moved') as Element)).toBe(0);
  });

  it('returns the same board reference when there is nothing to roll back', () => {
    const board = [buildElement('el-1')];

    expect(rollbackFailedMutation(board, board, board)).toBe(board);
  });

  it('returns the same board reference when an optimistically created element is already gone', () => {
    const board: readonly Element[] = [];
    const previous: readonly Element[] = [];
    const next = [buildElement('el-1')];

    expect(rollbackFailedMutation(board, previous, next)).toBe(board);
  });

  it('sorts restored elements deterministically by createdAt', () => {
    const older = buildElement('older', { createdAt: new Date('2024-01-01T00:00:00Z') });
    const newer = buildElement('newer', { createdAt: new Date('2024-01-05T00:00:00Z') });
    const previous = [newer, older];
    const next: readonly Element[] = [];

    const result = rollbackFailedMutation([], previous, next);

    expect(result.map((element) => element.id.value)).toEqual(['older', 'newer']);
  });
});
