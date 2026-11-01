import {
  createNoteElement,
  createTaskElement,
  type CreateTaskElementProps,
  type TaskElement,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  isBoardDropNoop,
  nextBoardOrderForStatusChange,
  resolveBoardOrderForDrop,
  selectTaskPlan,
  selectTaskPlanBoard,
} from '../../../../application/services/task-plan';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');
const OTHER_USER_ID = UserId.create('user-2');

const BASE = {
  workspaceId: WORKSPACE_ID,
  createdBy: USER_ID,
  position: Position.create(0, 0),
  size: Size.create(100, 80),
};

function task(id: string, overrides: Partial<CreateTaskElementProps> = {}): TaskElement {
  return createTaskElement({
    ...BASE,
    id: ElementId.create(id),
    title: id,
    status: 'todo',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

const ALL_FILTERS = { status: 'all', onlyMine: false } as const;

describe('selectTaskPlan', () => {
  it('ignores elements that are not tasks', () => {
    const note = createNoteElement({
      ...BASE,
      id: ElementId.create('note-1'),
      content: 'Not a task',
    });

    expect(selectTaskPlan([note, task('task-1')], ALL_FILTERS)).toEqual([
      { status: 'todo', tasks: [expect.objectContaining({ id: ElementId.create('task-1') })] },
    ]);
  });

  it('groups tasks by status in the canonical order and omits empty groups', () => {
    const groups = selectTaskPlan(
      [
        task('blocked', { status: 'blocked' }),
        task('completed', { status: 'completed' }),
        task('progress', { status: 'in_progress' }),
        task('todo', { status: 'todo' }),
      ],
      ALL_FILTERS,
    );

    expect(groups.map((group) => group.status)).toEqual([
      'todo',
      'in_progress',
      'completed',
      'blocked',
    ]);
    expect(groups.flatMap((group) => group.tasks.map((entry) => entry.id.value))).toEqual([
      'todo',
      'progress',
      'completed',
      'blocked',
    ]);
  });

  it('orders tasks by due date ascending with undated tasks last', () => {
    const groups = selectTaskPlan(
      [
        task('undated'),
        task('late', { dueDate: new Date('2024-03-01T00:00:00.000Z') }),
        task('early', { dueDate: new Date('2024-02-01T00:00:00.000Z') }),
      ],
      ALL_FILTERS,
    );

    expect(groups[0]?.tasks.map((entry) => entry.id.value)).toEqual(['early', 'late', 'undated']);
  });

  it('breaks due date ties by creation time and then id', () => {
    const dueDate = new Date('2024-02-01T00:00:00.000Z');
    const groups = selectTaskPlan(
      [
        task('z-task', { dueDate, createdAt: new Date('2024-01-02T00:00:00.000Z') }),
        task('b-task', { dueDate, createdAt: new Date('2024-01-01T00:00:00.000Z') }),
        task('a-task', { dueDate, createdAt: new Date('2024-01-01T00:00:00.000Z') }),
      ],
      ALL_FILTERS,
    );

    expect(groups[0]?.tasks.map((entry) => entry.id.value)).toEqual(['a-task', 'b-task', 'z-task']);
  });

  it('filters by a single status', () => {
    const groups = selectTaskPlan([task('todo'), task('progress', { status: 'in_progress' })], {
      status: 'in_progress',
      onlyMine: false,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.status).toBe('in_progress');
    expect(groups[0]?.tasks.map((entry) => entry.id.value)).toEqual(['progress']);
  });

  it('filters tasks assigned to the current user when onlyMine is enabled', () => {
    const groups = selectTaskPlan(
      [
        task('mine', { assigneeId: USER_ID }),
        task('theirs', { assigneeId: OTHER_USER_ID }),
        task('unassigned'),
      ],
      { status: 'all', onlyMine: true, currentUserId: USER_ID.value },
    );

    expect(groups[0]?.tasks.map((entry) => entry.id.value)).toEqual(['mine']);
  });

  it('returns no tasks when onlyMine is enabled without a current user', () => {
    const groups = selectTaskPlan([task('mine', { assigneeId: USER_ID })], {
      status: 'all',
      onlyMine: true,
    });

    expect(groups).toEqual([]);
  });

  it('returns an empty plan when there are no tasks', () => {
    expect(selectTaskPlan([], ALL_FILTERS)).toEqual([]);
  });

  it('does not mutate the input elements or their order', () => {
    const first = task('first', { dueDate: new Date('2024-03-01T00:00:00.000Z') });
    const second = task('second', { dueDate: new Date('2024-02-01T00:00:00.000Z') });
    const elements = [first, second];

    selectTaskPlan(elements, ALL_FILTERS);

    expect(elements).toEqual([first, second]);
  });
});

describe('selectTaskPlanBoard', () => {
  it('returns one column per canonical status, including empty ones', () => {
    const columns = selectTaskPlanBoard(
      [task('todo'), task('blocked', { status: 'blocked' })],
      ALL_FILTERS,
    );

    expect(columns.map((column) => column.status)).toEqual([
      'todo',
      'in_progress',
      'completed',
      'blocked',
    ]);
    expect(columns.map((column) => column.tasks.length)).toEqual([1, 0, 0, 1]);
  });

  it('returns all four empty columns when there are no tasks', () => {
    const columns = selectTaskPlanBoard([], ALL_FILTERS);

    expect(columns.map((column) => column.status)).toEqual([
      'todo',
      'in_progress',
      'completed',
      'blocked',
    ]);
    expect(columns.every((column) => column.tasks.length === 0)).toBe(true);
  });

  it('ignores non-task elements and orders tasks inside each column', () => {
    const note = createNoteElement({
      ...BASE,
      id: ElementId.create('note-1'),
      content: 'Not a task',
    });
    const columns = selectTaskPlanBoard(
      [
        note,
        task('late', { dueDate: new Date('2024-03-01T00:00:00.000Z') }),
        task('undated'),
        task('early', { dueDate: new Date('2024-02-01T00:00:00.000Z') }),
      ],
      ALL_FILTERS,
    );

    expect(columns[0]?.tasks.map((entry) => entry.id.value)).toEqual(['early', 'late', 'undated']);
  });

  it('applies the same filters as the list view', () => {
    const columns = selectTaskPlanBoard(
      [
        task('mine', { assigneeId: USER_ID }),
        task('theirs', { assigneeId: OTHER_USER_ID }),
        task('progress', { status: 'in_progress', assigneeId: USER_ID }),
      ],
      { status: 'in_progress', onlyMine: true, currentUserId: USER_ID.value },
    );

    expect(columns.map((column) => column.tasks.map((entry) => entry.id.value))).toEqual([
      [],
      ['progress'],
      [],
      [],
    ]);
  });

  it('does not mutate the input elements', () => {
    const first = task('first', { dueDate: new Date('2024-03-01T00:00:00.000Z') });
    const second = task('second', { dueDate: new Date('2024-02-01T00:00:00.000Z') });
    const elements = [first, second];

    selectTaskPlanBoard(elements, ALL_FILTERS);

    expect(elements).toEqual([first, second]);
  });
});

describe('board ordering', () => {
  it('orders the board by boardOrder instead of due date', () => {
    const columns = selectTaskPlanBoard(
      [
        task('late-date', {
          boardOrder: 10,
          dueDate: new Date('2024-12-01T00:00:00.000Z'),
        }),
        task('early-date', {
          boardOrder: 20,
          dueDate: new Date('2024-01-01T00:00:00.000Z'),
        }),
      ],
      ALL_FILTERS,
    );

    expect(columns[0]?.tasks.map((entry) => entry.id.value)).toEqual(['late-date', 'early-date']);
  });

  it('keeps the list view ordered by due date', () => {
    const groups = selectTaskPlan(
      [
        task('late-date', {
          boardOrder: 10,
          dueDate: new Date('2024-12-01T00:00:00.000Z'),
        }),
        task('early-date', {
          boardOrder: 20,
          dueDate: new Date('2024-01-01T00:00:00.000Z'),
        }),
      ],
      ALL_FILTERS,
    );

    expect(groups[0]?.tasks.map((entry) => entry.id.value)).toEqual(['early-date', 'late-date']);
  });

  it('appends after the last task of the destination column', () => {
    const elements = [
      task('first', { status: 'completed', boardOrder: 10 }),
      task('second', { status: 'completed', boardOrder: 20 }),
    ];

    expect(nextBoardOrderForStatusChange(elements, 'completed')).toBe(21);
    expect(nextBoardOrderForStatusChange(elements, 'blocked')).toBe(0);
  });

  it('resolves the order for start, end and before positions', () => {
    const elements = [
      task('first', { status: 'completed', boardOrder: 10 }),
      task('second', { status: 'completed', boardOrder: 20 }),
    ];

    expect(resolveBoardOrderForDrop(elements, 'completed', { kind: 'start' })).toBe(9);
    expect(resolveBoardOrderForDrop(elements, 'completed', { kind: 'end' })).toBe(21);
    expect(
      resolveBoardOrderForDrop(elements, 'completed', { kind: 'before', taskId: 'second' }),
    ).toBe(15);
    expect(
      resolveBoardOrderForDrop(elements, 'completed', { kind: 'before', taskId: 'first' }),
    ).toBe(9);
  });

  it('keeps insert-before strictly before the target when neighbors tie', () => {
    const elements = [
      task('first', { status: 'completed', boardOrder: 10 }),
      task('second', { status: 'completed', boardOrder: 10 }),
    ];

    expect(
      resolveBoardOrderForDrop(elements, 'completed', { kind: 'before', taskId: 'second' }),
    ).toBeLessThan(10);
  });

  it('detects drops that would not change the position', () => {
    const elements = [task('first', { boardOrder: 10 }), task('second', { boardOrder: 20 })];

    expect(isBoardDropNoop(elements, 'second', 'todo', { kind: 'end' })).toBe(true);
    expect(isBoardDropNoop(elements, 'first', 'todo', { kind: 'start' })).toBe(true);
    expect(isBoardDropNoop(elements, 'first', 'todo', { kind: 'before', taskId: 'second' })).toBe(
      true,
    );
    expect(isBoardDropNoop(elements, 'second', 'todo', { kind: 'start' })).toBe(false);
    expect(isBoardDropNoop(elements, 'first', 'completed', { kind: 'end' })).toBe(false);
  });
});
