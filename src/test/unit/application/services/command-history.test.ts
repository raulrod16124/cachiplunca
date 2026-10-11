import {
  createCommandHistory,
  type CommandHistory,
  DEFAULT_COMMAND_HISTORY_CAPACITY,
} from '../../../../application/services';
import {
  createFunctionCommand,
  createMoveElement,
  type Command,
  type CommandResult,
} from '../../../../application/commands';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const UPDATED_AT = new Date('2024-02-01T00:00:00Z');

const textElement = (id: string, position: Position): Element =>
  createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position,
    size: Size.create(100, 40),
    content: `content-${id}`,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });

interface MoveCommandOptions {
  readonly elementId: string;
  readonly from: Position;
  readonly to: Position;
}

function createMoveCommand(options: MoveCommandOptions): Command<readonly Element[]> {
  const moveElement = createMoveElement({ now: () => UPDATED_AT });

  const move = (
    state: readonly Element[],
    position: Position,
  ): CommandResult<readonly Element[]> => {
    const next: Element[] = [];

    for (const element of state) {
      if (element.id.value !== options.elementId) {
        next.push(element);
        continue;
      }

      const result = moveElement({ element, position });

      if (result.status === 'error') {
        return { status: 'error', error: result.error };
      }

      next.push(result.element);
    }

    return { status: 'ok', state: next };
  };

  return createFunctionCommand({
    metadata: { label: `Move ${options.elementId}` },
    apply: (state) => move(state, options.to),
    revert: (state) => move(state, options.from),
  });
}

function createFailingCommand(): Command<readonly Element[]> {
  return createFunctionCommand({
    metadata: { label: 'Fail' },
    apply: () => ({
      status: 'error',
      error: {
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
        message: 'invalid',
      },
    }),
    revert: () => ({
      status: 'error',
      error: {
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
        message: 'invalid',
      },
    }),
  });
}

const expectOk = <S>(result: CommandResult<S>): S => {
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got error: ${result.error.code}`);
  }
  return result.state;
};

const positionOf = (state: readonly Element[], id: string): Position => {
  const element = state.find((candidate) => candidate.id.value === id);
  if (element === undefined) {
    throw new Error(`Element ${id} not found`);
  }
  return element.position;
};

const initialState = (): readonly Element[] => [textElement('elem-1', Position.create(0, 0))];

const historyWith = (capacity?: number): CommandHistory<readonly Element[]> =>
  createCommandHistory({ initial: initialState(), capacity });

describe('createCommandHistory', () => {
  it('starts with the initial state and no history', () => {
    const history = historyWith();

    expect(history.getState()).toEqual(initialState());
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('executes a command, updates the state and records it as undoable', () => {
    const history = historyWith();
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(30, 40),
    });

    const result = expectOk(history.execute(command));

    expect(positionOf(result, 'elem-1').equals(Position.create(30, 40))).toBe(true);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(30, 40))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('undoes back to the previous state and redoes forward', () => {
    const history = historyWith();
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(30, 40),
    });

    expectOk(history.execute(command));
    const undone = expectOk(history.undo());

    expect(positionOf(undone, 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    const redone = expectOk(history.redo());

    expect(positionOf(redone, 'elem-1').equals(Position.create(30, 40))).toBe(true);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(30, 40))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('undoes and redoes multiple steps in order', () => {
    const history = historyWith();
    const first = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });
    const second = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(10, 10),
      to: Position.create(20, 20),
    });

    expectOk(history.execute(first));
    expectOk(history.execute(second));

    const afterFirstUndo = expectOk(history.undo());
    expect(positionOf(afterFirstUndo, 'elem-1').equals(Position.create(10, 10))).toBe(true);

    const afterSecondUndo = expectOk(history.undo());
    expect(positionOf(afterSecondUndo, 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(history.canUndo()).toBe(false);

    expect(positionOf(expectOk(history.redo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(positionOf(expectOk(history.redo()), 'elem-1').equals(Position.create(20, 20))).toBe(
      true,
    );
    expect(history.canRedo()).toBe(false);
  });

  it('discards the redo branch when a new command is executed after undo', () => {
    const history = historyWith();
    const first = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });
    const branch = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(50, 50),
    });

    expectOk(history.execute(first));
    expectOk(history.undo());
    expect(history.canRedo()).toBe(true);

    expectOk(history.execute(branch));

    expect(history.canRedo()).toBe(false);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(50, 50))).toBe(true);
  });

  it('propagates a command failure without changing the state or the history', () => {
    const history = historyWith();

    const result = history.execute(createFailingCommand());

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
    expect(history.getState()).toEqual(initialState());
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('is a no-op that keeps the state when there is nothing to undo or redo', () => {
    const history = historyWith();

    const undone = expectOk(history.undo());
    const redone = expectOk(history.redo());

    expect(undone).toEqual(initialState());
    expect(redone).toEqual(initialState());
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('clears the history without changing the current state', () => {
    const history = historyWith();
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(30, 40),
    });

    expectOk(history.execute(command));
    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(30, 40))).toBe(true);
  });

  it('drops the oldest command when the capacity is exceeded', () => {
    const history = historyWith(2);
    const first = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });
    const second = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(10, 10),
      to: Position.create(20, 20),
    });
    const third = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(20, 20),
      to: Position.create(30, 30),
    });

    expectOk(history.execute(first));
    expectOk(history.execute(second));
    expectOk(history.execute(third));

    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(20, 20))).toBe(
      true,
    );
    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(history.canUndo()).toBe(false);
  });

  it('falls back to the default capacity when given an invalid one', () => {
    const history = createCommandHistory({
      initial: initialState(),
      capacity: 0,
    });
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });

    expect(DEFAULT_COMMAND_HISTORY_CAPACITY).toBeGreaterThan(0);
    expectOk(history.execute(command));
    expect(history.canUndo()).toBe(true);
  });

  it('never mutates the input state across a sequence of valid commands', () => {
    const state = initialState();
    const snapshot = [...state];
    const history = createCommandHistory({ initial: state });
    const forward = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });

    expectOk(history.execute(forward));
    expectOk(history.undo());
    expectOk(history.redo());

    expect(state).toEqual(snapshot);
    expect(positionOf(state, 'elem-1').equals(Position.create(0, 0))).toBe(true);
  });
});
