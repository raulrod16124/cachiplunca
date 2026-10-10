import { createLinkElement, withLinkTitle, withLinkUrl } from '../../../../domain/element';
import type { CreateLinkElementProps, LinkElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (overrides: Partial<CreateLinkElementProps> = {}): CreateLinkElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  url: 'https://example.com',
  ...overrides,
});

const createSample = (overrides: Partial<CreateLinkElementProps> = {}): LinkElement =>
  createLinkElement(createProps({ createdAt: new Date('2024-01-01T00:00:00Z'), ...overrides }));

describe('LinkElement', () => {
  it('creates a valid link element with sane defaults', () => {
    const element = createLinkElement(createProps());

    expect(element.type).toBe('link');
    expect(element.url).toBe('https://example.com');
    expect(element.title).toBeUndefined();
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('creates a link element with an explicit title', () => {
    const element = createLinkElement(createProps({ title: 'Docs' }));

    expect(element.title).toBe('Docs');
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createLinkElement(
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

  it('rejects an empty url', () => {
    expect(() => createLinkElement(createProps({ url: '' }))).toThrow(/url/);
  });

  it('rejects a url that is only whitespace', () => {
    expect(() => createLinkElement(createProps({ url: '   ' }))).toThrow(/url/);
  });

  it('rejects a non-string url coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { url: 123 });
    expect(() => createLinkElement(untrusted)).toThrow(/url/);
  });

  it('rejects a title that is only whitespace', () => {
    expect(() => createLinkElement(createProps({ title: '   ' }))).toThrow(/title/);
  });

  it('rejects a non-string title coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { title: 123 });
    expect(() => createLinkElement(untrusted)).toThrow(/title/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createLinkElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createLinkElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating url without mutating the original', () => {
    const original = createSample({ title: 'Docs' });
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withLinkUrl(original, 'https://next.example.com', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.url).toBe('https://next.example.com');
    expect(updated.title).toBe('Docs');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.url).toBe('https://example.com');
  });

  it('rejects an invalid url on update', () => {
    const original = createSample();

    expect(() => withLinkUrl(original, '   ')).toThrow(/url/);
  });

  it('returns a new element when updating title without mutating the original', () => {
    const original = createSample({ title: 'Docs' });
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withLinkTitle(original, 'Handbook', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.title).toBe('Handbook');
    expect(updated.url).toBe('https://example.com');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.title).toBe('Docs');
  });

  it('clears the title when updated with undefined', () => {
    const original = createSample({ title: 'Docs' });

    const updated = withLinkTitle(original, undefined);

    expect(updated.title).toBeUndefined();
    expect(updated.url).toBe('https://example.com');
  });

  it('rejects an invalid title on update', () => {
    const original = createSample();

    expect(() => withLinkTitle(original, '   ')).toThrow(/title/);
  });

  it('preserves unrelated fields across updates', () => {
    const original = createSample({ rotation: 15 });

    const updated = withLinkUrl(original, 'https://next.example.com');

    expect(updated.rotation).toBe(15);
    expect(updated.position.equals(original.position)).toBe(true);
    expect(updated.size.equals(original.size)).toBe(true);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createSample({ createdAt: new Date('2024-01-02T00:00:00Z') });

    expect(() => withLinkTitle(original, 'Handbook', new Date('2024-01-01T00:00:00Z'))).toThrow(
      /updatedAt/,
    );
  });
});
