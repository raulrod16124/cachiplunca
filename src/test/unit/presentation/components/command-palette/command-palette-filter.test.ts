import {
  filterCommandPaletteGroups,
  firstEnabledCommandPaletteIndex,
  flattenCommandPaletteGroups,
  nextEnabledCommandPaletteIndex,
} from '../../../../../presentation/components/command-palette/command-palette-filter';
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from '../../../../../presentation/components/command-palette/command-palette.types';

function item(
  overrides: Partial<CommandPaletteItem> & Pick<CommandPaletteItem, 'id'>,
): CommandPaletteItem {
  return {
    label: overrides.id,
    onSelect: jest.fn(),
    ...overrides,
  };
}

const GROUPS: readonly CommandPaletteGroup[] = [
  {
    id: 'actions',
    label: 'Actions',
    items: [
      item({ id: 'add-note', label: 'Add note', keywords: 'create sticky' }),
      item({ id: 'add-task', label: 'Add task', keywords: 'create todo' }),
      item({ id: 'undo', label: 'Undo', disabled: true }),
    ],
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    items: [item({ id: 'roadmap', label: 'Roadmap Q4', description: 'Quarterly plan' })],
  },
];

describe('filterCommandPaletteGroups', () => {
  it('returns all groups and items for an empty query', () => {
    expect(filterCommandPaletteGroups(GROUPS, '')).toEqual(GROUPS);
  });

  it('filters by label', () => {
    const filtered = filterCommandPaletteGroups(GROUPS, 'note');

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.items.map((entry) => entry.id)).toEqual(['add-note']);
  });

  it('filters by description and keywords', () => {
    expect(
      flattenCommandPaletteGroups(filterCommandPaletteGroups(GROUPS, 'quarterly')),
    ).toHaveLength(1);
    expect(
      flattenCommandPaletteGroups(filterCommandPaletteGroups(GROUPS, 'sticky')).map(
        (entry) => entry.id,
      ),
    ).toEqual(['add-note']);
  });

  it('is case and accent-insensitive', () => {
    const accented: readonly CommandPaletteGroup[] = [
      {
        id: 'actions',
        label: 'Acciones',
        items: [item({ id: 'crear', label: 'Crear nota' })],
      },
    ];

    expect(filterCommandPaletteGroups(accented, 'CREAR')).toHaveLength(1);
    expect(filterCommandPaletteGroups(accented, 'nota')).toHaveLength(1);
  });

  it('drops groups without matches', () => {
    expect(filterCommandPaletteGroups(GROUPS, 'missing')).toEqual([]);
  });
});

describe('command palette navigation helpers', () => {
  const items = flattenCommandPaletteGroups(GROUPS);

  it('finds the first enabled item', () => {
    expect(firstEnabledCommandPaletteIndex(items)).toBe(0);
    expect(firstEnabledCommandPaletteIndex([item({ id: 'a', disabled: true })])).toBe(-1);
  });

  it('skips disabled items when moving', () => {
    expect(nextEnabledCommandPaletteIndex(items, 1, 1)).toBe(3);
    expect(nextEnabledCommandPaletteIndex(items, 3, 1)).toBe(0);
    expect(nextEnabledCommandPaletteIndex(items, 0, -1)).toBe(3);
  });

  it('wraps from a negative index', () => {
    expect(nextEnabledCommandPaletteIndex(items, -1, 1)).toBe(0);
    expect(nextEnabledCommandPaletteIndex(items, -1, -1)).toBe(3);
  });

  it('returns -1 when every item is disabled', () => {
    const disabled = [item({ id: 'a', disabled: true }), item({ id: 'b', disabled: true })];

    expect(nextEnabledCommandPaletteIndex(disabled, 0, 1)).toBe(-1);
  });
});
