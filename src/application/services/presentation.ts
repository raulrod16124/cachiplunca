import { isFrameElement } from '../../domain/element';
import type { Element, FrameElement } from '../../domain/element';

export function selectPresentationFrames(elements: readonly Element[]): readonly FrameElement[] {
  return elements.filter(isFrameElement).sort(compareFrames);
}

function compareFrames(left: FrameElement, right: FrameElement): number {
  const topDiff = left.position.y - right.position.y;

  if (topDiff !== 0) {
    return topDiff;
  }

  const leftDiff = left.position.x - right.position.x;

  if (leftDiff !== 0) {
    return leftDiff;
  }

  return left.id.value.localeCompare(right.id.value);
}
