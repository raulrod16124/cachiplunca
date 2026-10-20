import {
  IMAGE_MAX_SIZE_BYTES,
  buildImageStoragePath,
  imageAltFromFileName,
  sanitizeFileName,
  validateImageUploadFile,
} from '../../../../application/services/image-upload';
import type { ImageUploadFile } from '../../../../application/ports';
import { ERROR_CODES } from '../../../../shared/errors';

function file(overrides: Partial<ImageUploadFile> = {}): ImageUploadFile {
  return {
    name: 'diagram.png',
    contentType: 'image/png',
    size: 1024,
    data: new ArrayBuffer(8),
    ...overrides,
  };
}

describe('validateImageUploadFile', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])(
    'accepts %s files within the size limit',
    (contentType) => {
      expect(validateImageUploadFile(file({ contentType }))).toBeNull();
    },
  );

  it('rejects unsupported content types', () => {
    const error = validateImageUploadFile(file({ contentType: 'image/svg+xml' }));

    expect(error?.code).toBe(ERROR_CODES.IMAGE_INVALID_TYPE);
  });

  it('rejects empty and oversized files', () => {
    expect(validateImageUploadFile(file({ size: 0 }))?.code).toBe(ERROR_CODES.IMAGE_TOO_LARGE);
    expect(validateImageUploadFile(file({ size: IMAGE_MAX_SIZE_BYTES + 1 }))?.code).toBe(
      ERROR_CODES.IMAGE_TOO_LARGE,
    );
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateImageUploadFile(file({ size: IMAGE_MAX_SIZE_BYTES }))).toBeNull();
  });
});

describe('imageAltFromFileName', () => {
  it('derives a readable description from the file name', () => {
    expect(imageAltFromFileName('team_photo-v2.png')).toBe('team photo v2');
    expect(imageAltFromFileName('roadmap.jpg')).toBe('roadmap');
  });

  it('returns an empty description when there is nothing usable', () => {
    expect(imageAltFromFileName('.png')).toBe('');
  });
});

describe('buildImageStoragePath', () => {
  it('scopes the object to the workspace and sanitizes the name', () => {
    expect(buildImageStoragePath('ws-1', 'image-1', 'My Photo (final).PNG')).toBe(
      'workspaces/ws-1/images/image-1-My-Photo-final.PNG',
    );
  });

  it('falls back to a safe name when the file name has no usable characters', () => {
    expect(sanitizeFileName('///')).toBe('image');
    expect(sanitizeFileName('áccent édge.png')).toBe('accent-edge.png');
  });
});
