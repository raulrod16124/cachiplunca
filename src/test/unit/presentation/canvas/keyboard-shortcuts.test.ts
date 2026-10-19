import { SHORTCUT_GROUPS } from '../../../../presentation/canvas/keyboard-shortcuts';
import { MESSAGES } from '../../../../presentation/i18n/messages';

describe('keyboard shortcut catalogue', () => {
  it('groups shortcuts in canvas, selection and editing contexts', () => {
    expect(SHORTCUT_GROUPS.map((group) => group.id)).toEqual(['canvas', 'selection', 'editing']);
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
      'canvas.pan',
      'canvas.scroll',
      'canvas.zoom',
      'selection.navigate',
      'selection.extend',
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
    ]);
  });
});
