import { SHORTCUT_GROUPS } from '../../../../presentation/canvas/keyboard-shortcuts';
import { MESSAGES } from '../../../../presentation/i18n/messages';

describe('keyboard shortcut catalogue', () => {
  it('groups shortcuts in general, canvas, selection, editing and presentation contexts', () => {
    expect(SHORTCUT_GROUPS.map((group) => group.id)).toEqual([
      'general',
      'canvas',
      'selection',
      'editing',
      'presentation',
    ]);
  });

  it('uses unique group and shortcut ids', () => {
    const groupIds = SHORTCUT_GROUPS.map((group) => group.id);
    const entryIds = SHORTCUT_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id));

    expect(new Set(groupIds).size).toBe(groupIds.length);
    expect(new Set(entryIds).size).toBe(entryIds.length);
    expect(entryIds.length).toBeGreaterThan(0);
  });

  it('has a non-empty label and key combination in every locale', () => {
    for (const group of SHORTCUT_GROUPS) {
      expect(MESSAGES.en[group.titleKey]).not.toBe('');
      expect(MESSAGES.es[group.titleKey]).not.toBe('');

      for (const entry of group.entries) {
        expect(MESSAGES.en[entry.labelKey]).not.toBe('');
        expect(MESSAGES.en[entry.keysKey]).not.toBe('');
        expect(MESSAGES.es[entry.labelKey]).not.toBe('');
        expect(MESSAGES.es[entry.keysKey]).not.toBe('');
      }
    }
  });

  it('lists every shortcut implemented on the board', () => {
    expect(SHORTCUT_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id))).toEqual([
      'general.command-palette',
      'general.shortcuts',
      'canvas.pan',
      'canvas.scroll',
      'canvas.zoom',
      'selection.navigate',
      'selection.extend',
      'selection.rotate',
      'selection.marquee',
      'selection.clear',
      'selection.select-all',
      'selection.delete',
      'selection.duplicate',
      'selection.copy',
      'selection.paste',
      'selection.undo',
      'selection.redo',
      'selection.bring-to-front',
      'selection.send-to-back',
      'selection.context-menu',
      'editing.edit',
      'editing.cancel',
      'editing.commit',
      'presentation.navigate',
      'presentation.exit',
    ]);
  });

  it('documents the command palette, shortcut dialog, redo alternatives and presentation keys', () => {
    expect(MESSAGES.en['shortcuts.keys.commandPalette']).toContain('Ctrl/Cmd + K');
    expect(MESSAGES.en['shortcuts.keys.shortcuts']).toBe('?');
    expect(MESSAGES.en['shortcuts.keys.redo']).toContain('Ctrl/Cmd + Shift + Z');
    expect(MESSAGES.en['shortcuts.keys.redo']).toContain('Ctrl/Cmd + Y');
    expect(MESSAGES.en['shortcuts.keys.presentationNavigate']).toContain('PageUp/PageDown');
    expect(MESSAGES.en['shortcuts.keys.escape']).toBe('Esc');
  });
});
