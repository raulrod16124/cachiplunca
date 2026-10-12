import {
  createFunctionCommand,
  createMoveElement,
  createSnapshotCommand,
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

describe('createFunctionCommand', () => {
  it('exposes the provided metadata', () => {
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(0, 0),
      to: Position.create(10, 10),
    });

    expect(command.metadata.label).toBe('Move elem-1');
  });

  it('delegates execute to apply and undo to revert with the same state', () => {
    const calls: string[] = [];
    const command = createFunctionCommand<number>({
      metadata: { label: 'Increment' },
      apply: (state) => {
        calls.push(`apply:${state}`);
        return { status: 'ok', state: state + 1 };
      },
      revert: (state) => {
        calls.push(`revert:${state}`);
        return { status: 'ok', state: state - 1 };
      },
    });

    expect(expectOk(command.execute(1))).toBe(2);
    expect(expectOk(command.undo(1))).toBe(0);
    expect(calls).toEqual(['apply:1', 'revert:1']);
  });
});

describe('createSnapshotCommand', () => {
  it('applies the next state and reverts to the previous one regardless of input', () => {
    const previous: readonly Element[] = [textElement('elem-1', Position.create(10, 20))];
    const next: readonly Element[] = [textElement('elem-1', Position.create(30, 40))];
    const command = createSnapshotCommand(previous, next, 'Move elem-1');

    expect(command.metadata.label).toBe('Move elem-1');
    expect(expectOk(command.execute([textElement('unrelated', Position.create(0, 0))]))).toBe(next);
    expect(expectOk(command.undo(next))).toBe(previous);
  });
});

describe('Command<readonly Element[]> contract', () => {
  it('executes forward without mutating the input state or original element', () => {
    const original = textElement('elem-1', Position.create(10, 20));
    const state: readonly Element[] = [original, textElement('elem-2', Position.create(1, 1))];
    const stateSnapshot = [...state];

    const result = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(10, 20),
      to: Position.create(30, 40),
    }).execute(state);

    const next = expectOk(result);
    expect(positionOf(next, 'elem-1').equals(Position.create(30, 40))).toBe(true);
    expect(original.position.equals(Position.create(10, 20))).toBe(true);
    expect(state).toEqual(stateSnapshot);
  });

  it('undo restores the exact previous state', () => {
    const from = Position.create(10, 20);
    const state: readonly Element[] = [
      textElement('elem-1', from),
      textElement('elem-2', Position.create(1, 1)),
    ];
    const command = createMoveCommand({ elementId: 'elem-1', from, to: Position.create(30, 40) });

    const moved = expectOk(command.execute(state));
    const restored = expectOk(command.undo(moved));

    expect(positionOf(restored, 'elem-1').equals(from)).toBe(true);
    expect(positionOf(restored, 'elem-2').equals(Position.create(1, 1))).toBe(true);
  });

  it('execute, undo and redo preserve the forward state', () => {
    const from = Position.create(10, 20);
    const to = Position.create(30, 40);
    const state: readonly Element[] = [textElement('elem-1', from)];
    const command = createMoveCommand({ elementId: 'elem-1', from, to });

    const moved = expectOk(command.execute(state));
    const undone = expectOk(command.undo(moved));
    const redone = expectOk(command.execute(undone));

    expect(positionOf(moved, 'elem-1').equals(to)).toBe(true);
    expect(positionOf(undone, 'elem-1').equals(from)).toBe(true);
    expect(positionOf(redone, 'elem-1').equals(to)).toBe(true);
  });

  it('surfaces a validation error instead of throwing', () => {
    const state: readonly Element[] = [textElement('elem-1', Position.create(10, 20))];
    const command = createMoveCommand({
      elementId: 'elem-1',
      from: Position.create(10, 20),
      to: { x: Number.NaN, y: 0 } as Position,
    });

    const result = command.execute(state);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does not corrupt state across sequences of valid commands', () => {
    const from = Position.create(10, 20);
    const to = Position.create(90, 100);
    const state: readonly Element[] = [textElement('elem-1', from)];
    const command = createMoveCommand({ elementId: 'elem-1', from, to });

    const afterFirst = expectOk(command.execute(state));
    const afterSecond = expectOk(command.execute(afterFirst));
    const afterSecondUndo = expectOk(command.undo(afterSecond));
    const afterFirstUndo = expectOk(command.undo(afterSecondUndo));

    expect(positionOf(afterFirst, 'elem-1').equals(to)).toBe(true);
    expect(positionOf(afterSecond, 'elem-1').equals(to)).toBe(true);
    expect(positionOf(afterSecondUndo, 'elem-1').equals(from)).toBe(true);
    expect(positionOf(afterFirstUndo, 'elem-1').equals(from)).toBe(true);
    expect(afterFirstUndo.map((element) => element.id.value)).toEqual(
      state.map((element) => element.id.value),
    );
  });
});
