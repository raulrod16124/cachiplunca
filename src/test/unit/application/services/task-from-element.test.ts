import {
  createFrameElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  richTextFromPlain,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  TASK_FROM_ELEMENT_OFFSET,
  TASK_FROM_ELEMENT_TITLE_MAX_LENGTH,
  taskDraftFromElement,
  taskPositionFromElement,
} from '../../../../application/services/task-from-element';

const BASE = {
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(100, 100),
  size: Size.create(200, 160),
};

function note(content: string) {
  return createNoteElement({
    ...BASE,
    id: ElementId.create('note-1'),
    content,
  });
}

function frame(title: string) {
  return createFrameElement({
    ...BASE,
    id: ElementId.create('frame-1'),
    title,
  });
}

describe('taskDraftFromElement', () => {
  it('derives the title from the plain text of a note', () => {
    expect(taskDraftFromElement(note('Buy milk'))).toEqual({ title: 'Buy milk' });
  });

  it('normalizes line breaks and repeated whitespace in the title', () => {
    expect(taskDraftFromElement(note('First line\n\n  second   line'))).toEqual({
      title: 'First line second line',
    });
  });

  it('truncates long note titles and preserves the full content in notes', () => {
    const content = 'word '.repeat(40).trim();
    const source = note(content);
    const draft = taskDraftFromElement(source);

    expect(draft).not.toBeNull();
    expect(draft?.title).toBe(`${content.slice(0, TASK_FROM_ELEMENT_TITLE_MAX_LENGTH).trimEnd()}…`);
    expect(draft?.notes).toBe(source.content);
  });

  it('derives the title from a frame title', () => {
    expect(taskDraftFromElement(frame('Kickoff'))).toEqual({ title: 'Kickoff' });
  });

  it('returns null when the note has no usable text', () => {
    expect(taskDraftFromElement(note('   \n\t  '))).toBeNull();
  });

  it('returns null for elements that cannot be converted', () => {
    const text = createTextElement({
      ...BASE,
      id: ElementId.create('text-1'),
      content: 'Some text',
    });
    const task = createTaskElement({
      ...BASE,
      id: ElementId.create('task-1'),
      title: richTextFromPlain('Some task'),
      status: 'todo',
    });

    expect(taskDraftFromElement(text)).toBeNull();
    expect(taskDraftFromElement(task)).toBeNull();
  });
});

describe('taskPositionFromElement', () => {
  it('places the task to the right of the source element', () => {
    const position = taskPositionFromElement(note('Buy milk'));

    expect(position).toEqual(Position.create(100 + 200 + TASK_FROM_ELEMENT_OFFSET, 100));
  });
});
