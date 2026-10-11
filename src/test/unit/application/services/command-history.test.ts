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

const moveElement = createMoveElement({ now: () => UPDATED_AT });

function moveElementTo(
  state: readonly Element[],
  elementId: string,
  position: Position,
): CommandResult<readonly Element[]> {
  const next: Element[] = [];

  for (const element of state) {
    if (element.id.value !== elementId) {
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
}

function createMoveCommand(options: MoveCommandOptions): Command<readonly Element[]> {
  return createFunctionCommand({
    metadata: { label: `Move ${options.elementId}` },
    apply: (state) => moveElementTo(state, options.elementId, options.to),
    revert: (state) => moveElementTo(state, options.elementId, options.from),
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

  it('restores the command to the undo stack when undo fails', () => {
    const history = historyWith();
    const failingUndoCommand = createFunctionCommand<readonly Element[]>({
      metadata: { label: 'FailingUndo' },
      apply: (state) => ({
        status: 'ok',
        state: state,
      }),
      revert: () => ({
        status: 'error',
        error: {
          kind: 'validation',
          code: ERROR_CODES.VALIDATION_INVALID_INPUT,
          message: 'undo failed',
        },
      }),
    });

    expectOk(history.execute(failingUndoCommand));
    const result = history.undo();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.getState()).toEqual(initialState());
  });
});

const failingResult = (message: string): CommandResult<readonly Element[]> => ({
  status: 'error',
  error: {
    kind: 'validation',
    code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    message,
  },
});

function createFailOnceRedoCommand(): Command<readonly Element[]> {
  let applies = 0;

  return createFunctionCommand<readonly Element[]>({
    metadata: { label: 'FailOnceRedo' },
    apply: (state) => {
      applies += 1;

      if (applies > 1) {
        return failingResult('redo failed');
      }

      return moveElementTo(state, 'elem-1', Position.create(40, 40));
    },
    revert: (state) => moveElementTo(state, 'elem-1', Position.create(0, 0)),
  });
}

describe('createCommandHistory — edge cases', () => {
  it('supports undo/redo with a capacity of a single command', () => {
    const history = historyWith(1);
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
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(20, 20))).toBe(true);

    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(history.canUndo()).toBe(false);

    expect(positionOf(expectOk(history.redo()), 'elem-1').equals(Position.create(20, 20))).toBe(
      true,
    );
    expect(history.canRedo()).toBe(false);
  });

  it('does not evict commands when the history size equals the capacity', () => {
    const history = historyWith(3);
    const moves = [10, 20, 30].map((step) =>
      createMoveCommand({
        elementId: 'elem-1',
        from: Position.create(step - 10, step - 10),
        to: Position.create(step, step),
      }),
    );

    moves.forEach((move) => expectOk(history.execute(move)));

    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(20, 20))).toBe(
      true,
    );
    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(history.canUndo()).toBe(false);
  });

  it('floors fractional capacities instead of falling back to the default', () => {
    const history = createCommandHistory({ initial: initialState(), capacity: 2.9 });
    const moves = [10, 20, 30].map((step) =>
      createMoveCommand({
        elementId: 'elem-1',
        from: Position.create(step - 10, step - 10),
        to: Position.create(step, step),
      }),
    );

    moves.forEach((move) => expectOk(history.execute(move)));

    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(20, 20))).toBe(
      true,
    );
    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(history.canUndo()).toBe(false);
  });

  it.each([
    ['negative', -3],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ])('falls back to the default capacity for %s capacities', (_label, capacity) => {
    const history = createCommandHistory({ initial: initialState(), capacity });
    const moves = [10, 20, 30].map((step) =>
      createMoveCommand({
        elementId: 'elem-1',
        from: Position.create(step - 10, step - 10),
        to: Position.create(step, step),
      }),
    );

    moves.forEach((move) => expectOk(history.execute(move)));

    expect(history.canUndo()).toBe(true);
  });

  it('keeps the redo branch when an execute fails after an undo', () => {
    const history = historyWith();
    const move = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });

    expectOk(history.execute(move));
    expectOk(history.undo());
    expect(history.canRedo()).toBe(true);

    const result = history.execute(createFailingCommand());

    expect(result.status).toBe('error');
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);

    expect(positionOf(expectOk(history.redo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
  });

  it('restores the command to the redo stack when redo fails', () => {
    const history = historyWith();
    const command = createFailOnceRedoCommand();

    expectOk(history.execute(command));
    expectOk(history.undo());
    expect(history.canRedo()).toBe(true);

    const result = history.redo();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('redo failed');
    }
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);
  });

  it('clears both stacks without losing the current state or the capacity', () => {
    const history = historyWith(2);
    const move = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });

    expectOk(history.execute(move));
    expectOk(history.undo());
    expect(history.canRedo()).toBe(true);

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);

    const second = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });
    const third = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(10, 10),
      to: Position.create(20, 20),
    });

    expectOk(history.execute(second));
    expectOk(history.execute(third));
    expect(positionOf(expectOk(history.undo()), 'elem-1').equals(Position.create(10, 10))).toBe(
      true,
    );
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);
  });

  it('returns the same state instance for empty undo and redo', () => {
    const history = historyWith();
    const state = history.getState();

    expect(expectOk(history.undo())).toBe(state);
    expect(expectOk(history.redo())).toBe(state);
    expect(history.getState()).toBe(state);
  });

  it('keeps state and flags consistent across interleaved undo/redo sequences', () => {
    const history = historyWith(4);
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
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(10, 10))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expectOk(history.undo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    expectOk(history.redo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(10, 10))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expectOk(history.execute(second));
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(20, 20))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expectOk(history.undo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(10, 10))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    expectOk(history.undo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(0, 0))).toBe(true);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    expectOk(history.redo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(10, 10))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    expectOk(history.redo());
    expect(positionOf(history.getState(), 'elem-1').equals(Position.create(20, 20))).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });
});

const sameElements = (a: readonly Element[], b: readonly Element[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index++) {
    if (a[index].id.value !== b[index].id.value) {
      return false;
    }

    if (!a[index].position.equals(b[index].position)) {
      return false;
    }
  }

  return true;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) | 0;

    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ModelStep {
  readonly command: Command<readonly Element[]>;
  readonly stateAfter: readonly Element[];
}

interface HistoryModel {
  readonly getState: () => readonly Element[];
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly stacksWithinCapacity: () => boolean;
  readonly execute: (command: Command<readonly Element[]>) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly reconcile: () => boolean;
}

function createHistoryModel(initial: readonly Element[], capacity: number): HistoryModel {
  let state = initial;
  let base = initial;
  const undoSteps: ModelStep[] = [];
  const redoStack: Command<readonly Element[]>[] = [];

  const pushUndoStep = (step: ModelStep): void => {
    undoSteps.push(step);

    if (undoSteps.length > capacity) {
      const dropped = undoSteps.shift();
      if (dropped !== undefined) {
        base = dropped.stateAfter;
      }
    }
  };

  return {
    getState: () => state,
    canUndo: () => undoSteps.length > 0,
    canRedo: () => redoStack.length > 0,
    stacksWithinCapacity: () =>
      undoSteps.length <= capacity && undoSteps.length + redoStack.length <= capacity,
    execute(command) {
      const result = command.execute(state);

      if (result.status === 'error') {
        return;
      }

      state = result.state;
      pushUndoStep({ command, stateAfter: state });
      redoStack.length = 0;
    },
    undo() {
      const step = undoSteps.pop();

      if (step === undefined) {
        return;
      }

      const result = step.command.undo(state);

      if (result.status === 'error') {
        undoSteps.push(step);
        return;
      }

      state = result.state;
      redoStack.push(step.command);
    },
    redo() {
      const command = redoStack.pop();

      if (command === undefined) {
        return;
      }

      const result = command.execute(state);

      if (result.status === 'error') {
        redoStack.push(command);
        return;
      }

      state = result.state;
      pushUndoStep({ command, stateAfter: state });
    },
    reconcile() {
      let rebuilt = base;

      for (const step of undoSteps) {
        const result = step.command.execute(rebuilt);

        if (result.status === 'error') {
          return false;
        }

        rebuilt = result.state;
      }

      return sameElements(rebuilt, state);
    },
  };
}

describe('createCommandHistory — property sequences', () => {
  const SEEDS = [3, 42, 2024];
  const STEPS = 600;
  const CAPACITIES = [1, 3, 6];

  it.each(SEEDS.flatMap((seed) => CAPACITIES.map((capacity) => [seed, capacity] as const)))(
    'keeps the state consistent across random sequences (seed=%i, capacity=%i)',
    (seed, capacity) => {
      const random = mulberry32(seed + capacity);
      const history = createCommandHistory({ initial: initialState(), capacity });
      const model = createHistoryModel(initialState(), capacity);

      for (let step = 0; step < STEPS; step++) {
        const pick = random();

        if (pick < 0.5) {
          const command = createMoveCommand({
            elementId: 'elem-1',
            from: positionOf(model.getState(), 'elem-1'),
            to: Position.create(Math.floor(random() * 1000), Math.floor(random() * 1000)),
          });

          expectOk(history.execute(command));
          model.execute(command);
        } else if (pick < 0.8) {
          history.undo();
          model.undo();
        } else {
          history.redo();
          model.redo();
        }

        expect(sameElements(history.getState(), model.getState())).toBe(true);
        expect(history.canUndo()).toBe(model.canUndo());
        expect(history.canRedo()).toBe(model.canRedo());
        expect(model.stacksWithinCapacity()).toBe(true);
      }

      expect(model.reconcile()).toBe(true);
    },
  );
});
