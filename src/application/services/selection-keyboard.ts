export type SelectionKeyCommand = 'clear' | 'select-all' | 'delete' | 'duplicate' | null;

export interface SelectionKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

export function resolveSelectionKeyCommand(input: SelectionKeyInput): SelectionKeyCommand {
  if (input.key === 'Escape') {
    return 'clear';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'a') {
    return 'select-all';
  }

  if ((input.ctrlKey || input.metaKey) && !input.altKey && input.key.toLowerCase() === 'd') {
    return 'duplicate';
  }

  if (input.key === 'Delete') {
    return 'delete';
  }

  return null;
}
