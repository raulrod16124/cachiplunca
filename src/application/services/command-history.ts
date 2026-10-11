import type { Command, CommandResult } from '../commands';

export const DEFAULT_COMMAND_HISTORY_CAPACITY = 100;

export interface CommandHistoryOptions<S> {
  readonly initial: S;
  readonly capacity?: number;
}

export interface CommandHistory<S> {
  readonly getState: () => S;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly execute: (command: Command<S>) => CommandResult<S>;
  readonly undo: () => CommandResult<S>;
  readonly redo: () => CommandResult<S>;
  readonly clear: () => void;
}

export function createCommandHistory<S>(options: CommandHistoryOptions<S>): CommandHistory<S> {
  const capacity = normalizeCapacity(options.capacity);

  let state = options.initial;
  const undoStack: Command<S>[] = [];
  const redoStack: Command<S>[] = [];

  return {
    getState: () => state,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,

    execute(command) {
      const result = command.execute(state);

      if (result.status === 'error') {
        return result;
      }

      state = result.state;
      push(undoStack, command, capacity);
      redoStack.length = 0;

      return result;
    },

    undo() {
      const command = undoStack.pop();

      if (command === undefined) {
        return { status: 'ok', state };
      }

      const result = command.undo(state);

      if (result.status === 'error') {
        undoStack.push(command);
        return result;
      }

      state = result.state;
      redoStack.push(command);

      return result;
    },

    redo() {
      const command = redoStack.pop();

      if (command === undefined) {
        return { status: 'ok', state };
      }

      const result = command.execute(state);

      if (result.status === 'error') {
        redoStack.push(command);
        return result;
      }

      state = result.state;
      push(undoStack, command, capacity);

      return result;
    },

    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}

function normalizeCapacity(capacity: number | undefined): number {
  if (capacity === undefined || !Number.isFinite(capacity) || capacity < 1) {
    return DEFAULT_COMMAND_HISTORY_CAPACITY;
  }

  return Math.floor(capacity);
}

function push<S>(stack: Command<S>[], command: Command<S>, capacity: number): void {
  stack.push(command);

  if (stack.length > capacity) {
    stack.shift();
  }
}
