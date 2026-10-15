import { Bounds } from '../../../../domain/shared';
import { getVisibleElementIds } from '../../../../application/services/canvas-visibility';
import type { CanvasVisibilityItem } from '../../../../application/services/canvas-visibility';

const VISIBLE = Bounds.fromXYWH(0, 0, 1000, 800);

function item(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): CanvasVisibilityItem {
  return { id, bounds: Bounds.fromXYWH(x, y, width, height) };
}

describe('getVisibleElementIds', () => {
  it('devuelve vacío cuando no hay elementos', () => {
    expect(getVisibleElementIds([], VISIBLE)).toEqual([]);
  });

  it('incluye elementos completamente dentro del viewport', () => {
    const elements = [item('a', 10, 20, 50, 40), item('b', 900, 700, 50, 50)];

    expect(getVisibleElementIds(elements, VISIBLE)).toEqual(['a', 'b']);
  });

  it('incluye elementos parcialmente visibles en cada borde', () => {
    const elements = [
      item('left', -10, 100, 50, 50),
      item('right', 980, 100, 50, 50),
      item('top', 100, -5, 50, 50),
      item('bottom', 100, 780, 50, 50),
    ];

    expect(getVisibleElementIds(elements, VISIBLE)).toEqual(['left', 'right', 'top', 'bottom']);
  });

  it('excluye elementos completamente fuera del viewport', () => {
    const elements = [
      item('far-left', -200, 100, 50, 50),
      item('far-right', 1200, 100, 50, 50),
      item('far-top', 100, -500, 50, 50),
      item('far-bottom', 100, 900, 50, 50),
    ];

    expect(getVisibleElementIds(elements, VISIBLE)).toEqual([]);
  });

  it('respeta el margen para evitar popping en bordes', () => {
    const elements = [
      item('just-out-left', -15, 100, 10, 50),
      item('just-out-right', 1005, 100, 10, 50),
    ];

    expect(getVisibleElementIds(elements, VISIBLE, 0)).toEqual([]);
    expect(getVisibleElementIds(elements, VISIBLE, 10)).toEqual([
      'just-out-left',
      'just-out-right',
    ]);
  });

  it('trata un margen inválido como cero', () => {
    const elements = [item('just-out-left', -15, 100, 10, 50)];

    expect(getVisibleElementIds(elements, VISIBLE, -10)).toEqual([]);
    expect(getVisibleElementIds(elements, VISIBLE, Number.NaN)).toEqual([]);
    expect(getVisibleElementIds(elements, VISIBLE, Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('devuelve los ids en orden de aparición', () => {
    const elements = [
      item('z', 500, 500, 10, 10),
      item('a', 100, 100, 10, 10),
      item('m', 300, 300, 10, 10),
    ];

    expect(getVisibleElementIds(elements, VISIBLE)).toEqual(['z', 'a', 'm']);
  });

  it('excluye todo cuando el viewport tiene dimensiones cero', () => {
    const elements = [item('a', 10, 10, 10, 10)];

    expect(getVisibleElementIds(elements, Bounds.fromXYWH(0, 0, 0, 0))).toEqual([]);
  });

  it('no muta el arreglo de entrada', () => {
    const elements = [item('a', 10, 10, 10, 10)];
    const copy = elements.slice();

    getVisibleElementIds(elements, VISIBLE);

    expect(elements).toEqual(copy);
  });
});
