import type { Editor } from '@tiptap/core';
import type { RichTextDocument } from '../../../domain/element';
import { applyFormatToEditor, getEditorFormatState } from './editor-format';
import { applyFormatToDocument, getTextFormatState } from './text-format';
import type { TextFormatAction, TextFormatState } from './text-format';

export interface TextFormatTarget {
  readonly getState: () => TextFormatState;
  readonly applyAction: (action: TextFormatAction) => void;
}

export function editorFormatTarget(editor: Editor): TextFormatTarget {
  return {
    getState: () => getEditorFormatState(editor),
    applyAction: (action) => {
      applyFormatToEditor(editor, action);
    },
  };
}

export interface DocumentFormatTargetOptions {
  readonly getDocument: () => RichTextDocument | null | undefined;
  readonly commitDocument: (doc: RichTextDocument) => void;
}

export function documentFormatTarget(options: DocumentFormatTargetOptions): TextFormatTarget {
  return {
    getState: () => {
      const doc = options.getDocument();
      return doc === null || doc === undefined ? emptyTextFormatState() : getTextFormatState(doc);
    },
    applyAction: (action) => {
      const doc = options.getDocument();

      if (doc === null || doc === undefined) {
        return;
      }

      const next = applyFormatToDocument(doc, action, getTextFormatState(doc));

      if (JSON.stringify(next) === JSON.stringify(doc)) {
        return;
      }

      options.commitDocument(next);
    },
  };
}

function emptyTextFormatState(): TextFormatState {
  return {
    bold: 'off',
    italic: 'off',
    underline: 'off',
    strikethrough: 'off',
    highlight: 'off',
    align: 'left',
    heading: 'off',
    bulletList: 'off',
    orderedList: 'off',
  };
}
