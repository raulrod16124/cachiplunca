import { TEXT_BOOLEAN_MARKS } from '../../../domain/element';
import type {
  TextBooleanMark,
  TextHeadingState,
  TextBooleanMarkState,
} from '../../../domain/element';
import type { TextFormatAction, TextFormatState } from './text-format';

export interface FormatPainterState {
  readonly armed: boolean;
  readonly captured: TextFormatState | null;
}

export function idleFormatPainter(): FormatPainterState {
  return { armed: false, captured: null };
}

export function armFormatPainter(state: TextFormatState): FormatPainterState {
  return { armed: true, captured: state };
}

export function buildFormatPainterActions(
  captured: TextFormatState,
  current: TextFormatState,
): TextFormatAction[] {
  const actions: TextFormatAction[] = [];

  for (const mark of TEXT_BOOLEAN_MARKS) {
    actions.push(...markActions(mark, captured[mark], current[mark]));
  }

  if (captured.fontFamily !== undefined && captured.fontFamily !== current.fontFamily) {
    actions.push({ kind: 'fontFamily', value: captured.fontFamily });
  }

  if (captured.fontSize !== undefined && captured.fontSize !== current.fontSize) {
    actions.push({ kind: 'fontSize', value: captured.fontSize });
  }

  if (captured.color !== undefined && captured.color !== current.color) {
    actions.push({ kind: 'color', value: captured.color });
  }

  if (captured.highlightColor !== undefined && captured.highlightColor !== current.highlightColor) {
    actions.push({ kind: 'highlightColor', value: captured.highlightColor });
  }

  if (captured.align !== undefined && captured.align !== current.align) {
    actions.push({ kind: 'align', value: captured.align });
  }

  const heading = headingAction(captured.heading, current.heading);
  if (heading !== null) {
    actions.push(heading);
  }

  const bulletList = listAction('bulletList', captured.bulletList, current.bulletList);
  if (bulletList !== null) {
    actions.push(bulletList);
  }

  const orderedList = listAction('orderedList', captured.orderedList, current.orderedList);
  if (orderedList !== null) {
    actions.push(orderedList);
  }

  return actions;
}

function markActions(
  mark: TextBooleanMark,
  captured: TextBooleanMarkState,
  current: TextBooleanMarkState,
): TextFormatAction[] {
  const desired = captured === 'on';

  if (current === (desired ? 'on' : 'off')) {
    return [];
  }

  const action: TextFormatAction = { kind: 'toggleMark', mark };
  const secondToggle: TextFormatAction = { kind: 'toggleMark', mark };

  return !desired && current === 'mixed' ? [action, secondToggle] : [action];
}

function headingAction(
  captured: TextHeadingState,
  current: TextHeadingState,
): TextFormatAction | null {
  if (captured === 'mixed' || captured === current) {
    return null;
  }

  return { kind: 'heading', level: captured === 'off' ? null : captured };
}

function listAction(
  value: 'bulletList' | 'orderedList',
  captured: TextBooleanMarkState,
  current: TextBooleanMarkState,
): TextFormatAction | null {
  if (captured === 'mixed' || captured === current) {
    return null;
  }

  if (captured === 'on') {
    return { kind: 'list', value };
  }

  return current === 'on' ? { kind: 'list', value: null } : null;
}
