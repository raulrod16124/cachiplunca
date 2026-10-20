import { createFrameElement, createNoteElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { selectPresentationFrames } from '../../../../application/services/presentation';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function frame(id: string, x: number, y: number) {
  return createFrameElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(x, y),
    size: Size.create(400, 300),
    title: id,
  });
}

describe('selectPresentationFrames', () => {
  it('ignores elements that are not frames', () => {
    const note = createNoteElement({
      id: ElementId.create('note-1'),
      workspaceId: WORKSPACE_ID,
      createdBy: USER_ID,
      position: Position.create(0, 0),
      size: Size.create(100, 80),
      content: 'Not a frame',
    });

    expect(
      selectPresentationFrames([note, frame('frame-1', 0, 0)]).map((item) => item.id.value),
    ).toEqual(['frame-1']);
  });

  it('orders frames from top to bottom and then left to right', () => {
    const frames = [
      frame('bottom-right', 500, 600),
      frame('top-right', 500, 0),
      frame('bottom-left', 0, 600),
      frame('top-left', 0, 0),
    ];

    expect(selectPresentationFrames(frames).map((item) => item.id.value)).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ]);
  });

  it('breaks position ties by id to keep the order deterministic', () => {
    const frames = [frame('b', 10, 10), frame('a', 10, 10)];

    expect(selectPresentationFrames(frames).map((item) => item.id.value)).toEqual(['a', 'b']);
  });

  it('returns an empty list when there are no frames', () => {
    expect(selectPresentationFrames([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const frames = [frame('b', 0, 100), frame('a', 0, 0)];
    const original = [...frames];

    selectPresentationFrames(frames);

    expect(frames).toEqual(original);
  });
});
