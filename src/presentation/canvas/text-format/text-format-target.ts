import type { Editor } from '@tiptap/core';
import type { RichTextDocument } from '../../../domain/element';
import { applyFormatToEditor, getEditorFormatState } from './editor-format';
import { applyFormatToDocument, getTextFormatState } from './text-format';
import type { TextFormatAction, TextFormatState } from './text-format';

export interface TextFormatCapabilities {
  readonly lists: boolean;
}

export interface TextFormatTarget {
  readonly capabilities: TextFormatCapabilities;
  readonly getState: () => TextFormatState;
  readonly applyAction: (action: TextFormatAction) => void;
}

export interface EditorFormatTargetOptions {
  readonly singleLine?: boolean;
}

export function editorFormatTarget(
  editor: Editor,
  options: EditorFormatTargetOptions = {},
): TextFormatTarget {
  return {
    capabilities: { lists: options.singleLine !== true },
    getState: () => getEditorFormatState(editor),
    applyAction: (action) => {
      applyFormatToEditor(editor, action);
    },
  };
}

export interface DocumentFormatTargetOptions {
  readonly getDocument: () => RichTextDocument | null | undefined;
  readonly commitDocument: (doc: RichTextDocument) => void;
  readonly singleLine?: boolean;
}

export function documentFormatTarget(options: DocumentFormatTargetOptions): TextFormatTarget {
  return {
    capabilities: { lists: options.singleLine !== true },
    getState: () => {
      const doc = options.getDocument();
      return doc === null || doc === undefined ? emptyTextFormatState() : getTextFormatState(doc);
    },
    applyAction: (action) => {
      if (options.singleLine === true && action.kind === 'list') {
        return;
      }

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
