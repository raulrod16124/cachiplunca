import type { AppError } from '../../shared/errors';

export interface CommandMetadata {
  readonly label: string;
}

export interface CommandOk<S> {
  readonly status: 'ok';
  readonly state: S;
}

export interface CommandFailure {
  readonly status: 'error';
  readonly error: AppError;
}

export type CommandResult<S> = CommandOk<S> | CommandFailure;

export interface Command<S> {
  readonly metadata: CommandMetadata;
  execute(state: S): CommandResult<S>;
  undo(state: S): CommandResult<S>;
}

export interface FunctionCommandInput<S> {
  readonly metadata: CommandMetadata;
  readonly apply: (state: S) => CommandResult<S>;
  readonly revert: (state: S) => CommandResult<S>;
}

export function createFunctionCommand<S>(input: FunctionCommandInput<S>): Command<S> {
  return {
    metadata: input.metadata,
    execute: (state) => input.apply(state),
    undo: (state) => input.revert(state),
  };
}

export function createSnapshotCommand<S>(previous: S, next: S, label: string): Command<S> {
  return createFunctionCommand<S>({
    metadata: { label },
    apply: () => ({ status: 'ok', state: next }),
    revert: () => ({ status: 'ok', state: previous }),
  });
}
