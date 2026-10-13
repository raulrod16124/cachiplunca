import type { Element } from '../../domain/element';
import { createFunctionCommand, type Command } from '../commands';
import { applyElementWindow, rollbackFailedMutation } from './optimistic-element-updates';

export interface BoardWindowCommandInput {
  readonly readCurrent: () => readonly Element[];
  readonly previous: readonly Element[];
  readonly next: readonly Element[];
  readonly label: string;
}

export function createBoardWindowCommand(
  input: BoardWindowCommandInput,
): Command<readonly Element[]> {
  return createFunctionCommand<readonly Element[]>({
    metadata: { label: input.label },
    apply: () => ({
      status: 'ok',
      state: applyElementWindow(input.readCurrent(), input.previous, input.next),
    }),
    revert: () => ({
      status: 'ok',
      state: rollbackFailedMutation(input.readCurrent(), input.previous, input.next),
    }),
  });
}
