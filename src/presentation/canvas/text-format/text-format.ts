import {
  getDocumentAlign,
  getDocumentBooleanMarkState,
  getDocumentColor,
  getDocumentFontFamily,
  getDocumentFontSize,
  setDocumentAlign,
  setDocumentBooleanMark,
  setDocumentColor,
  setDocumentFontFamily,
  setDocumentFontSize,
} from '../../../domain/element';
import type {
  RichTextDocument,
  TextAlign,
  TextBooleanMark,
  TextBooleanMarkState,
  TextFontFamily,
  TextFontSize,
} from '../../../domain/element';

export type TextFormatAction =
  | { readonly kind: 'fontFamily'; readonly value: TextFontFamily }
  | { readonly kind: 'fontSize'; readonly value: TextFontSize }
  | { readonly kind: 'color'; readonly value: string }
  | { readonly kind: 'toggleMark'; readonly mark: TextBooleanMark }
  | { readonly kind: 'align'; readonly value: TextAlign };

export interface TextFormatState {
  readonly bold: TextBooleanMarkState;
  readonly italic: TextBooleanMarkState;
  readonly underline: TextBooleanMarkState;
  readonly strikethrough: TextBooleanMarkState;
  readonly highlight: TextBooleanMarkState;
  readonly fontFamily?: TextFontFamily;
  readonly fontSize?: TextFontSize;
  readonly color?: string;
  readonly align?: TextAlign;
}

export function getTextFormatState(doc: RichTextDocument): TextFormatState {
  return {
    bold: getDocumentBooleanMarkState(doc, 'bold'),
    italic: getDocumentBooleanMarkState(doc, 'italic'),
    underline: getDocumentBooleanMarkState(doc, 'underline'),
    strikethrough: getDocumentBooleanMarkState(doc, 'strikethrough'),
    highlight: getDocumentBooleanMarkState(doc, 'highlight'),
    ...(getDocumentFontFamily(doc) === undefined ? {} : { fontFamily: getDocumentFontFamily(doc) }),
    ...(getDocumentFontSize(doc) === undefined ? {} : { fontSize: getDocumentFontSize(doc) }),
    ...(getDocumentColor(doc) === undefined ? {} : { color: getDocumentColor(doc) }),
    ...(getDocumentAlign(doc) === undefined ? {} : { align: getDocumentAlign(doc) }),
  };
}

export function applyFormatToDocument(
  doc: RichTextDocument,
  action: TextFormatAction,
  state: TextFormatState,
): RichTextDocument {
  switch (action.kind) {
    case 'fontFamily':
      return setDocumentFontFamily(doc, action.value);
    case 'fontSize':
      return setDocumentFontSize(doc, action.value);
    case 'color':
      return setDocumentColor(doc, action.value);
    case 'toggleMark':
      return setDocumentBooleanMark(doc, action.mark, state[action.mark] !== 'on');
    case 'align':
      return setDocumentAlign(doc, action.value);
  }
}
