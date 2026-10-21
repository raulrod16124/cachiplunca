import {
  createImageElement,
  duplicateElement,
  isImageElement,
  validateElement,
  withImageAlt,
  withImageSrc,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

function props(overrides: Partial<Parameters<typeof createImageElement>[0]> = {}) {
  return {
    id: ElementId.create('image-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(320, 200),
    src: 'https://example.com/image.png',
    alt: 'Architecture diagram',
    ...overrides,
  };
}

describe('ImageElement', () => {
  it('creates an image element with src and alt', () => {
    const element = createImageElement(props());

    expect(element.type).toBe('image');
    expect(element.src).toBe('https://example.com/image.png');
    expect(element.alt).toBe('Architecture diagram');
    expect(isImageElement(element)).toBe(true);
    expect(() => validateElement(element)).not.toThrow();
  });

  it('rejects an empty src', () => {
    expect(() => createImageElement(props({ src: '   ' }))).toThrow(
      'ImageElement src cannot be empty',
    );
  });

  it('rejects a non-string alt', () => {
    expect(() => createImageElement(props({ alt: 42 as unknown as string }))).toThrow(
      'ImageElement alt must be a string',
    );
  });

  it('updates the src and alt through dedicated factories', () => {
    const element = createImageElement(props());

    const withNewSrc = withImageSrc(element, 'https://example.com/new.png');
    expect(withNewSrc.src).toBe('https://example.com/new.png');
    expect(withNewSrc.alt).toBe('Architecture diagram');

    const withNewAlt = withImageAlt(withNewSrc, 'Flow diagram');
    expect(withNewAlt.alt).toBe('Flow diagram');

    const withoutAlt = withImageAlt(withNewAlt, undefined);
    expect(withoutAlt.alt).toBeUndefined();
    expect(() => validateElement(withoutAlt)).not.toThrow();
  });

  it('rejects an empty src when updating', () => {
    const element = createImageElement(props());

    expect(() => withImageSrc(element, '')).toThrow('ImageElement src cannot be empty');
  });

  it('duplicates an image keeping its src and alt', () => {
    const element = createImageElement(props());

    const copy = duplicateElement(element, {
      id: ElementId.create('image-2'),
      createdAt: new Date('2026-10-20T10:00:00.000Z'),
    });

    expect(copy.type).toBe('image');
    if (!isImageElement(copy)) {
      throw new Error('Expected an image element');
    }
    expect(copy.id.value).toBe('image-2');
    expect(copy.src).toBe(element.src);
    expect(copy.alt).toBe(element.alt);
  });

  it('keeps the optional storage path and rejects an empty one', () => {
    const element = createImageElement(
      props({ storagePath: 'workspaces/ws-1/images/image-1-diagram.png' }),
    );

    expect(element.storagePath).toBe('workspaces/ws-1/images/image-1-diagram.png');
    expect(() => validateElement(element)).not.toThrow();
    expect(() => createImageElement(props({ storagePath: '   ' }))).toThrow(
      'ImageElement storagePath cannot be empty',
    );
  });

  it('duplicates an image keeping its storage path', () => {
    const element = createImageElement(
      props({ storagePath: 'workspaces/ws-1/images/image-1-diagram.png' }),
    );

    const copy = duplicateElement(element, {
      id: ElementId.create('image-2'),
      createdAt: new Date('2026-10-20T10:00:00.000Z'),
    });

    expect(isImageElement(copy)).toBe(true);
    if (isImageElement(copy)) {
      expect(copy.storagePath).toBe(element.storagePath);
    }
  });

  it('accepts legacy images without a storage path', () => {
    const element = createImageElement(props());

    expect(element.storagePath).toBeUndefined();
    expect(() => validateElement(element)).not.toThrow();
  });
});
