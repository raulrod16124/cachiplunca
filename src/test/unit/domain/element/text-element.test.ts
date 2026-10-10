import { createTextElement, withTextContent } from '../../../../domain/element';
import type { CreateTextElementProps } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (overrides: Partial<CreateTextElementProps> = {}): CreateTextElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  content: 'hello',
  ...overrides,
});

describe('TextElement', () => {
  it('creates a valid text element with sane defaults', () => {
    const element = createTextElement(createProps());

    expect(element.type).toBe('text');
    expect(element.content).toBe('hello');
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createTextElement(
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
    expect(() => createTextElement(createProps({ content: '' }))).not.toThrow();
  });

  it('rejects undefined content', () => {
    expect(() => createTextElement(createProps({ content: undefined }))).toThrow(/content/);
  });

  it('rejects non-string content coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { content: 123 });
    expect(() => createTextElement(untrusted)).toThrow(/content/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createTextElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createTextElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating content without mutating the original', () => {
    const original = createTextElement(
      createProps({ createdAt: new Date('2024-01-01T00:00:00Z') }),
    );
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withTextContent(original, 'updated text', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.content).toBe('updated text');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.content).toBe('hello');
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createTextElement(
      createProps({ createdAt: new Date('2024-01-02T00:00:00Z') }),
    );

    expect(() => withTextContent(original, 'next', new Date('2024-01-01T00:00:00Z'))).toThrow(
      /updatedAt/,
    );
  });

  it('accepts empty content on update', () => {
    const original = createTextElement(createProps());

    const updated = withTextContent(original, '');

    expect(updated.content).toBe('');
  });
});
