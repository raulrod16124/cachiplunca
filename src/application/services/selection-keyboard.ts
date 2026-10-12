export type SelectionKeyCommand =
  'clear' | 'select-all' | 'delete' | 'duplicate' | 'copy' | 'paste' | 'undo' | 'redo' | null;

export interface SelectionKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export function resolveSelectionKeyCommand(input: SelectionKeyInput): SelectionKeyCommand {
  if (input.key === 'Escape') {
    return 'clear';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'a') {
    return 'select-all';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'c') {
    return 'copy';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'v') {
    return 'paste';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'd') {
    return 'duplicate';
  }

  if (
    (input.ctrlKey || input.metaKey) &&
    !input.altKey &&
    input.shiftKey &&
    input.key.toLowerCase() === 'z'
  ) {
    return 'redo';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'y') {
    return 'redo';
  }

  if (
    (input.ctrlKey || input.metaKey) &&
    !input.altKey &&
    !input.shiftKey &&
    input.key.toLowerCase() === 'z'
  ) {
    return 'undo';
  }

  if (input.key === 'Delete') {
    return 'delete';
  }

  return null;
}
