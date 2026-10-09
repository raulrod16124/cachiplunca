export type SelectionKeyCommand = 'clear' | 'select-all' | null;

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

  return null;
}
