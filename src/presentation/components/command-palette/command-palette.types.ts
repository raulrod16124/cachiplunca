export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly keywords?: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

export interface CommandPaletteGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly CommandPaletteItem[];
}
