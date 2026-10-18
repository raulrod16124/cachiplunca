import {
  armFormatPainter,
  buildFormatPainterActions,
  idleFormatPainter,
} from '../../../../../presentation/canvas/text-format/format-painter-store';
import type { TextFormatState } from '../../../../../presentation/canvas/text-format/text-format';

function baseState(overrides?: Partial<TextFormatState>): TextFormatState {
  return {
    bold: 'off',
    italic: 'off',
    underline: 'off',
    strikethrough: 'off',
    highlight: 'off',
    heading: 'off',
    bulletList: 'off',
    orderedList: 'off',
    ...overrides,
  };
}

describe('format-painter-store', () => {
  it('starts idle with no capture', () => {
    expect(idleFormatPainter()).toEqual({ armed: false, captured: null });
  });

  it('arms with a snapshot of the state', () => {
    const state = baseState({ bold: 'on', fontSize: 18 });

    const painter = armFormatPainter(state);

    expect(painter.armed).toBe(true);
    expect(painter.captured).toEqual(state);
  });

  it('produces no actions when the states match', () => {
    const state = baseState({ bold: 'on' });

    expect(buildFormatPainterActions(state, state)).toEqual([]);
  });

  it('toggles marks that are off in the captured state', () => {
    const actions = buildFormatPainterActions(baseState(), baseState({ bold: 'on' }));

    expect(actions).toContainEqual({ kind: 'toggleMark', mark: 'bold' });
  });

  it('toggles marks that are on in the captured state', () => {
    const actions = buildFormatPainterActions(baseState({ italic: 'on' }), baseState());

    expect(actions).toContainEqual({ kind: 'toggleMark', mark: 'italic' });
  });

  it('emits a double toggle to clear a mixed mark', () => {
    const actions = buildFormatPainterActions(baseState(), baseState({ underline: 'mixed' }));

    const toggles = actions.filter(
      (action) => action.kind === 'toggleMark' && action.mark === 'underline',
    );

    expect(toggles).toHaveLength(2);
  });

  it('emits a single toggle when turning a mixed mark on', () => {
    const actions = buildFormatPainterActions(
      baseState({ bold: 'on' }),
      baseState({ bold: 'mixed' }),
    );

    const toggles = actions.filter(
      (action) => action.kind === 'toggleMark' && action.mark === 'bold',
    );

    expect(toggles).toHaveLength(1);
  });

  it('copies style values that differ', () => {
    const captured = baseState({
      fontFamily: 'arial',
      fontSize: 18,
      color: '#ff0000',
      highlightColor: '#ffe119',
      align: 'center',
    });

    const actions = buildFormatPainterActions(captured, baseState());

    expect(actions).toContainEqual({ kind: 'fontFamily', value: 'arial' });
    expect(actions).toContainEqual({ kind: 'fontSize', value: 18 });
    expect(actions).toContainEqual({ kind: 'color', value: '#ff0000' });
    expect(actions).toContainEqual({ kind: 'highlightColor', value: '#ffe119' });
    expect(actions).toContainEqual({ kind: 'align', value: 'center' });
  });

  it('omits style values that are undefined in the captured state', () => {
    const actions = buildFormatPainterActions(baseState(), baseState({ fontSize: 18 }));

    expect(actions).toEqual([]);
  });

  it('applies the captured heading level', () => {
    const actions = buildFormatPainterActions(baseState({ heading: 2 }), baseState());

    expect(actions).toContainEqual({ kind: 'heading', level: 2 });
  });

  it('resets the heading when the captured state is a paragraph', () => {
    const actions = buildFormatPainterActions(baseState(), baseState({ heading: 1 }));

    expect(actions).toContainEqual({ kind: 'heading', level: null });
  });

  it('ignores a mixed heading in the captured state', () => {
    const actions = buildFormatPainterActions(baseState({ heading: 'mixed' }), baseState());

    expect(actions).toEqual([]);
  });

  it('turns a list on when the captured state has it', () => {
    const actions = buildFormatPainterActions(baseState({ bulletList: 'on' }), baseState());

    expect(actions).toContainEqual({ kind: 'list', value: 'bulletList' });
  });

  it('turns a list off when the captured state does not have it', () => {
    const actions = buildFormatPainterActions(baseState(), baseState({ orderedList: 'on' }));

    expect(actions).toContainEqual({ kind: 'list', value: null });
  });
});
