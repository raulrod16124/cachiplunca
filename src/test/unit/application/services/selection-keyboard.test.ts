import { resolveSelectionKeyCommand } from '../../../../application/services/selection-keyboard';

const NO_MODIFIERS = { ctrlKey: false, metaKey: false, altKey: false };

describe('resolveSelectionKeyCommand', () => {
  it('resolves Escape to clear', () => {
    expect(resolveSelectionKeyCommand({ key: 'Escape', ...NO_MODIFIERS })).toBe('clear');
  });

  it('resolves Ctrl+A to select-all', () => {
    expect(resolveSelectionKeyCommand({ key: 'a', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'select-all',
    );
  });

  it('resolves Cmd+A to select-all', () => {
    expect(resolveSelectionKeyCommand({ key: 'a', ...NO_MODIFIERS, metaKey: true })).toBe(
      'select-all',
    );
  });

  it('resolves an uppercase A with a modifier to select-all', () => {
    expect(resolveSelectionKeyCommand({ key: 'A', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'select-all',
    );
  });

  it('returns null for a plain A without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'a', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the select-all shortcut when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'a', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('resolves Delete to delete', () => {
    expect(resolveSelectionKeyCommand({ key: 'Delete', ...NO_MODIFIERS })).toBe('delete');
  });

  it('resolves Ctrl+D to duplicate', () => {
    expect(resolveSelectionKeyCommand({ key: 'd', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'duplicate',
    );
  });

  it('resolves Cmd+D to duplicate', () => {
    expect(resolveSelectionKeyCommand({ key: 'd', ...NO_MODIFIERS, metaKey: true })).toBe(
      'duplicate',
    );
  });

  it('resolves an uppercase D with a modifier to duplicate', () => {
    expect(resolveSelectionKeyCommand({ key: 'D', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'duplicate',
    );
  });

  it('returns null for a plain D without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'd', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the duplicate shortcut when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'd', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('returns null for unmapped keys', () => {
    expect(resolveSelectionKeyCommand({ key: 'ArrowRight', ...NO_MODIFIERS })).toBeNull();
    expect(resolveSelectionKeyCommand({ key: 'Backspace', ...NO_MODIFIERS })).toBeNull();
  });
});
