import { resolveSelectionKeyCommand } from '../../../../application/services/selection-keyboard';

const NO_MODIFIERS = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

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

  it('resolves Ctrl+C to copy', () => {
    expect(resolveSelectionKeyCommand({ key: 'c', ...NO_MODIFIERS, ctrlKey: true })).toBe('copy');
  });

  it('resolves Cmd+C to copy', () => {
    expect(resolveSelectionKeyCommand({ key: 'c', ...NO_MODIFIERS, metaKey: true })).toBe('copy');
  });

  it('resolves an uppercase C with a modifier to copy', () => {
    expect(resolveSelectionKeyCommand({ key: 'C', ...NO_MODIFIERS, ctrlKey: true })).toBe('copy');
  });

  it('returns null for a plain C without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'c', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the copy shortcut when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'c', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('resolves Ctrl+V to paste', () => {
    expect(resolveSelectionKeyCommand({ key: 'v', ...NO_MODIFIERS, ctrlKey: true })).toBe('paste');
  });

  it('resolves Cmd+V to paste', () => {
    expect(resolveSelectionKeyCommand({ key: 'v', ...NO_MODIFIERS, metaKey: true })).toBe('paste');
  });

  it('resolves an uppercase V with a modifier to paste', () => {
    expect(resolveSelectionKeyCommand({ key: 'V', ...NO_MODIFIERS, ctrlKey: true })).toBe('paste');
  });

  it('returns null for a plain V without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'v', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the paste shortcut when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'v', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('resolves Ctrl+Z to undo', () => {
    expect(resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, ctrlKey: true })).toBe('undo');
  });

  it('resolves Cmd+Z to undo', () => {
    expect(resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, metaKey: true })).toBe('undo');
  });

  it('resolves an uppercase Z with a modifier to undo', () => {
    expect(resolveSelectionKeyCommand({ key: 'Z', ...NO_MODIFIERS, ctrlKey: true })).toBe('undo');
  });

  it('returns null for a plain Z without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the undo shortcut when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('resolves Ctrl+Shift+Z to redo', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, ctrlKey: true, shiftKey: true }),
    ).toBe('redo');
  });

  it('resolves Cmd+Shift+Z to redo', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, metaKey: true, shiftKey: true }),
    ).toBe('redo');
  });

  it('resolves an uppercase Shift+Z with a modifier to redo', () => {
    expect(
      resolveSelectionKeyCommand({ key: 'Z', ...NO_MODIFIERS, ctrlKey: true, shiftKey: true }),
    ).toBe('redo');
  });

  it('resolves Ctrl+Y to redo', () => {
    expect(resolveSelectionKeyCommand({ key: 'y', ...NO_MODIFIERS, ctrlKey: true })).toBe('redo');
  });

  it('resolves Cmd+Y to redo', () => {
    expect(resolveSelectionKeyCommand({ key: 'y', ...NO_MODIFIERS, metaKey: true })).toBe('redo');
  });

  it('resolves an uppercase Y with a modifier to redo', () => {
    expect(resolveSelectionKeyCommand({ key: 'Y', ...NO_MODIFIERS, ctrlKey: true })).toBe('redo');
  });

  it('returns null for a plain Y without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'y', ...NO_MODIFIERS })).toBeNull();
  });

  it('returns null for a Shift+Z without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: 'z', ...NO_MODIFIERS, shiftKey: true })).toBeNull();
  });

  it('ignores the redo shortcuts when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({
        key: 'z',
        ...NO_MODIFIERS,
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
      }),
    ).toBeNull();
    expect(
      resolveSelectionKeyCommand({ key: 'y', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('resolves Ctrl+] to bring-to-front', () => {
    expect(resolveSelectionKeyCommand({ key: ']', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'bring-to-front',
    );
  });

  it('resolves Cmd+] to bring-to-front', () => {
    expect(resolveSelectionKeyCommand({ key: ']', ...NO_MODIFIERS, metaKey: true })).toBe(
      'bring-to-front',
    );
  });

  it('resolves Ctrl+[ to send-to-back', () => {
    expect(resolveSelectionKeyCommand({ key: '[', ...NO_MODIFIERS, ctrlKey: true })).toBe(
      'send-to-back',
    );
  });

  it('resolves Cmd+[ to send-to-back', () => {
    expect(resolveSelectionKeyCommand({ key: '[', ...NO_MODIFIERS, metaKey: true })).toBe(
      'send-to-back',
    );
  });

  it('returns null for plain brackets without a modifier', () => {
    expect(resolveSelectionKeyCommand({ key: ']', ...NO_MODIFIERS })).toBeNull();
    expect(resolveSelectionKeyCommand({ key: '[', ...NO_MODIFIERS })).toBeNull();
  });

  it('ignores the z-order shortcuts when Alt is also pressed', () => {
    expect(
      resolveSelectionKeyCommand({ key: ']', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
    expect(
      resolveSelectionKeyCommand({ key: '[', ...NO_MODIFIERS, ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('returns null for unmapped keys', () => {
    expect(resolveSelectionKeyCommand({ key: 'ArrowRight', ...NO_MODIFIERS })).toBeNull();
    expect(resolveSelectionKeyCommand({ key: 'Backspace', ...NO_MODIFIERS })).toBeNull();
  });
});
