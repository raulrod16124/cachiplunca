import {
  getDocumentAlign,
  getDocumentBooleanMarkState,
  getDocumentColor,
  getDocumentFontFamily,
  getDocumentFontSize,
  getDocumentHeadingState,
  getDocumentHighlightColor,
  getDocumentListState,
  setDocumentAlign,
  setDocumentBooleanMark,
  setDocumentColor,
  setDocumentFontFamily,
  setDocumentFontSize,
  setDocumentHeading,
  setDocumentHighlightColor,
  setDocumentList,
  stepDocumentFontSize,
} from '../../../domain/element';
import type {
  HeadingLevel,
  ListKind,
  RichTextDocument,
  TextAlign,
  TextBooleanMark,
  TextBooleanMarkState,
  TextFontFamily,
  TextFontSize,
  TextHeadingState,
} from '../../../domain/element';

export type TextFormatAction =
  | { readonly kind: 'fontFamily'; readonly value: TextFontFamily }
  | { readonly kind: 'fontSize'; readonly value: TextFontSize }
  | { readonly kind: 'increaseFontSize' }
  | { readonly kind: 'decreaseFontSize' }
  | { readonly kind: 'color'; readonly value: string | null }
  | { readonly kind: 'highlightColor'; readonly value: string | null }
  | { readonly kind: 'toggleMark'; readonly mark: TextBooleanMark }
  | { readonly kind: 'align'; readonly value: TextAlign }
  | { readonly kind: 'heading'; readonly level: HeadingLevel | null }
  | { readonly kind: 'list'; readonly value: ListKind | null };

export interface TextFormatState {
  readonly bold: TextBooleanMarkState;
  readonly italic: TextBooleanMarkState;
  readonly underline: TextBooleanMarkState;
  readonly strikethrough: TextBooleanMarkState;
  readonly highlight: TextBooleanMarkState;
  readonly fontFamily?: TextFontFamily;
  readonly fontSize?: TextFontSize;
  readonly color?: string;
  readonly highlightColor?: string;
  readonly align?: TextAlign;
  readonly heading: TextHeadingState;
  readonly bulletList: TextBooleanMarkState;
  readonly orderedList: TextBooleanMarkState;
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
    ...(getDocumentHighlightColor(doc) === undefined
      ? {}
      : { highlightColor: getDocumentHighlightColor(doc) }),
    ...(getDocumentAlign(doc) === undefined ? {} : { align: getDocumentAlign(doc) }),
    heading: getDocumentHeadingState(doc),
    bulletList: getDocumentListState(doc, 'bulletList'),
    orderedList: getDocumentListState(doc, 'orderedList'),
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
    case 'increaseFontSize':
      return stepDocumentFontSize(doc, 1);
    case 'decreaseFontSize':
      return stepDocumentFontSize(doc, -1);
    case 'color':
      return setDocumentColor(doc, action.value);
    case 'highlightColor':
      if (action.value === null) {
        return setDocumentBooleanMark(doc, 'highlight', false);
      }
      return setDocumentHighlightColor(doc, action.value);
    case 'toggleMark':
      return setDocumentBooleanMark(doc, action.mark, state[action.mark] !== 'on');
    case 'align':
      return setDocumentAlign(doc, action.value);
    case 'heading':
      return setDocumentHeading(doc, action.level);
    case 'list':
      return setDocumentList(doc, action.value);
  }
}
