import type { TranslationKey } from '../i18n';

export type ShortcutGroupId = 'canvas' | 'selection' | 'editing';

export interface ShortcutEntry {
  readonly id: string;
  readonly labelKey: TranslationKey;
  readonly keysKey: TranslationKey;
}

export interface ShortcutGroup {
  readonly id: ShortcutGroupId;
  readonly titleKey: TranslationKey;
  readonly entries: readonly ShortcutEntry[];
}

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    id: 'canvas',
    titleKey: 'shortcuts.group.canvas',
    entries: [
      { id: 'canvas.pan', labelKey: 'shortcuts.canvas.pan', keysKey: 'shortcuts.keys.pan' },
      {
        id: 'canvas.scroll',
        labelKey: 'shortcuts.canvas.scroll',
        keysKey: 'shortcuts.keys.scroll',
      },
      { id: 'canvas.zoom', labelKey: 'shortcuts.canvas.zoom', keysKey: 'shortcuts.keys.zoom' },
    ],
  },
  {
    id: 'selection',
    titleKey: 'shortcuts.group.selection',
    entries: [
      {
        id: 'selection.navigate',
        labelKey: 'shortcuts.selection.navigate',
        keysKey: 'shortcuts.keys.arrowKeys',
      },
      {
        id: 'selection.extend',
        labelKey: 'shortcuts.selection.extend',
        keysKey: 'shortcuts.keys.shiftArrowKeys',
      },
      {
        id: 'selection.rotate',
        labelKey: 'shortcuts.selection.rotate',
        keysKey: 'shortcuts.keys.rotate',
      },
      {
        id: 'selection.marquee',
        labelKey: 'shortcuts.selection.marquee',
        keysKey: 'shortcuts.keys.marquee',
      },
      {
        id: 'selection.clear',
        labelKey: 'shortcuts.selection.clear',
        keysKey: 'shortcuts.keys.escape',
      },
      {
        id: 'selection.select-all',
        labelKey: 'shortcuts.selection.selectAll',
        keysKey: 'shortcuts.keys.selectAll',
      },
      {
        id: 'selection.delete',
        labelKey: 'shortcuts.selection.delete',
        keysKey: 'shortcuts.keys.delete',
      },
      {
        id: 'selection.duplicate',
        labelKey: 'shortcuts.selection.duplicate',
        keysKey: 'shortcuts.keys.duplicate',
      },
      {
        id: 'selection.copy',
        labelKey: 'shortcuts.selection.copy',
        keysKey: 'shortcuts.keys.copy',
      },
      {
        id: 'selection.paste',
        labelKey: 'shortcuts.selection.paste',
        keysKey: 'shortcuts.keys.paste',
      },
      {
        id: 'selection.undo',
        labelKey: 'shortcuts.selection.undo',
        keysKey: 'shortcuts.keys.undo',
      },
      {
        id: 'selection.redo',
        labelKey: 'shortcuts.selection.redo',
        keysKey: 'shortcuts.keys.redo',
      },
      {
        id: 'selection.bring-to-front',
        labelKey: 'shortcuts.selection.bringToFront',
        keysKey: 'shortcuts.keys.bringToFront',
      },
      {
        id: 'selection.send-to-back',
        labelKey: 'shortcuts.selection.sendToBack',
        keysKey: 'shortcuts.keys.sendToBack',
      },
      {
        id: 'selection.context-menu',
        labelKey: 'shortcuts.selection.contextMenu',
        keysKey: 'shortcuts.keys.contextMenu',
      },
    ],
  },
  {
    id: 'editing',
    titleKey: 'shortcuts.group.editing',
    entries: [
      { id: 'editing.edit', labelKey: 'shortcuts.editing.edit', keysKey: 'shortcuts.keys.edit' },
      {
        id: 'editing.cancel',
        labelKey: 'shortcuts.editing.cancel',
        keysKey: 'shortcuts.keys.escape',
      },
      {
        id: 'editing.commit',
        labelKey: 'shortcuts.editing.commit',
        keysKey: 'shortcuts.keys.commitEdit',
      },
    ],
  },
];
