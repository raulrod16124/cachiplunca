import { createFrameElement, withFrameParent, withFrameTitle } from '../../../../domain/element';
import type { CreateFrameElementProps, FrameElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (
  overrides: Partial<CreateFrameElementProps> = {},
): CreateFrameElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  title: 'board',
  ...overrides,
});

const createSample = (overrides: Partial<CreateFrameElementProps> = {}): FrameElement =>
  createFrameElement(createProps({ createdAt: new Date('2024-01-01T00:00:00Z'), ...overrides }));

describe('FrameElement', () => {
  it('creates a valid frame element with sane defaults', () => {
    const element = createFrameElement(createProps());

    expect(element.type).toBe('frame');
    expect(element.title).toBe('board');
    expect(element.parentFrameId).toBeUndefined();
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('creates a frame element with a parent frame', () => {
    const parentFrameId = ElementId.create('parent');

    const element = createFrameElement(createProps({ parentFrameId }));

    expect(element.parentFrameId?.value).toBe('parent');
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createFrameElement(
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

  it('rejects undefined title', () => {
    expect(() => createFrameElement(createProps({ title: undefined }))).toThrow(/title/);
  });

  it('rejects empty or whitespace-only title coming from untrusted data', () => {
    expect(() => createFrameElement(createProps({ title: '' }))).toThrow(/title/);
    expect(() => createFrameElement(createProps({ title: '   ' }))).toThrow(/title/);
  });

  it('rejects non-string title coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { title: 123 });
    expect(() => createFrameElement(untrusted)).toThrow(/title/);
  });

  it('rejects an invalid parent frame id from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { parentFrameId: 'parent' });
    expect(() => createFrameElement(untrusted)).toThrow(/parentFrameId/);
  });

  it('rejects a frame that is its own parent', () => {
    expect(() =>
      createFrameElement(
        createProps({
          id: ElementId.create('self'),
          parentFrameId: ElementId.create('self'),
        }),
      ),
    ).toThrow(/parent/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createFrameElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createFrameElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating the title without mutating the original', () => {
    const original = createSample();
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withFrameTitle(original, 'updated title', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.title).toBe('updated title');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.title).toBe('board');
  });

  it('rejects an invalid title on update', () => {
    const original = createSample();
    expect(() => withFrameTitle(original, '   ')).toThrow(/title/);
  });

  it('sets and clears the parent frame without mutating the original', () => {
    const original = createSample();
    const parentFrameId = ElementId.create('parent');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const nested = withFrameParent(original, parentFrameId, updatedAt);
    const cleared = withFrameParent(nested, undefined, updatedAt);

    expect(nested).not.toBe(original);
    expect(nested.parentFrameId?.value).toBe('parent');
    expect(original.parentFrameId).toBeUndefined();
    expect(cleared.parentFrameId).toBeUndefined();
    expect('parentFrameId' in cleared).toBe(false);
  });

  it('rejects an invalid parent frame id on update', () => {
    const original = createSample();
    const untrusted = Object.assign(createSample(), { parentFrameId: 'parent' });
    expect(() => withFrameParent(original, untrusted.parentFrameId)).toThrow(/parentFrameId/);
  });

  it('rejects a parent frame equal to the element itself on update', () => {
    const original = createSample();
    expect(() => withFrameParent(original, original.id)).toThrow(/parent/);
  });

  it('preserves unrelated fields across updates', () => {
    const parentFrameId = ElementId.create('parent');
    const original = createSample({ parentFrameId, rotation: 15 });

    const updated = withFrameTitle(original, 'next title');

    expect(updated.parentFrameId?.value).toBe('parent');
    expect(updated.rotation).toBe(15);
    expect(updated.position.equals(original.position)).toBe(true);
    expect(updated.size.equals(original.size)).toBe(true);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createSample({ createdAt: new Date('2024-01-02T00:00:00Z') });

    expect(() => withFrameTitle(original, 'next', new Date('2024-01-01T00:00:00Z'))).toThrow(
      /updatedAt/,
    );
  });
});
