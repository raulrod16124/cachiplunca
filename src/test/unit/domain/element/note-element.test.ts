import { createNoteElement, withNoteColor, withNoteContent } from '../../../../domain/element';
import type { CreateNoteElementProps } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (overrides: Partial<CreateNoteElementProps> = {}): CreateNoteElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  content: 'note content',
  ...overrides,
});

describe('NoteElement', () => {
  it('creates a valid note element with sane defaults', () => {
    const element = createNoteElement(createProps());

    expect(element.type).toBe('note');
    expect(element.content).toBe('note content');
    expect(element.color).toBeUndefined();
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('creates a note element with an explicit color', () => {
    const element = createNoteElement(createProps({ color: '#fff' }));

    expect(element.color).toBe('#fff');
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createNoteElement(
      createProps({ position, size, createdAt, updatedAt, rotation: 15 }),
    );

    expect(element.id.value).toBe('elem-1');
    expect(element.workspaceId.value).toBe('ws-1');
    expect(element.createdBy.value).toBe('user-1');
    expect(element.position.equals(position)).toBe(true);
    expect(element.size.equals(size)).toBe(true);
    expect(element.rotation).toBe(15);
    expect(element.createdAt).toBe(createdAt);
    expect(element.updatedAt).toBe(updatedAt);
  });

  it('allows empty content so the editor can start and type into it', () => {
    expect(() => createNoteElement(createProps({ content: '' }))).not.toThrow();
  });

  it('rejects undefined content', () => {
    expect(() => createNoteElement(createProps({ content: undefined }))).toThrow(/content/);
  });

  it('rejects non-string content coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { content: 123 });
    expect(() => createNoteElement(untrusted)).toThrow(/content/);
  });

  it('rejects non-string color coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { color: 123 });
    expect(() => createNoteElement(untrusted)).toThrow(/color/);
  });

  it('rejects a color that is only whitespace', () => {
    expect(() => createNoteElement(createProps({ color: '   ' }))).toThrow(/color/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createNoteElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createNoteElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating content without mutating the original', () => {
    const original = createNoteElement(
      createProps({ createdAt: new Date('2024-01-01T00:00:00Z') }),
    );
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withNoteContent(original, 'updated note', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.content).toBe('updated note');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.content).toBe('note content');
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createNoteElement(
      createProps({ createdAt: new Date('2024-01-02T00:00:00Z') }),
    );

    expect(() => withNoteContent(original, 'next', new Date('2024-01-01T00:00:00Z'))).toThrow(
      /updatedAt/,
    );
  });

  it('accepts empty content on update', () => {
    const original = createNoteElement(createProps());

    const updated = withNoteContent(original, '');

    expect(updated.content).toBe('');
  });

  it('returns a new element when updating color without mutating the original', () => {
    const original = createNoteElement(
      createProps({ color: '#fff', createdAt: new Date('2024-01-01T00:00:00Z') }),
    );
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withNoteColor(original, '#f00', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.color).toBe('#f00');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.color).toBe('#fff');
  });

  it('rejects an invalid color on update', () => {
    const original = createNoteElement(createProps());

    expect(() => withNoteColor(original, '   ')).toThrow(/color/);
  });
});
