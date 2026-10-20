import type { ImageUploadFile } from '../ports';
import { createAppError, ERROR_CODES, type AppError } from '../../shared/errors';

export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const IMAGE_ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export function validateImageUploadFile(file: ImageUploadFile): AppError | null {
  if (!isAllowedContentType(file.contentType)) {
    return createAppError(
      'validation',
      ERROR_CODES.IMAGE_INVALID_TYPE,
      'Choose a PNG, JPEG, WebP or GIF image.',
    );
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > IMAGE_MAX_SIZE_BYTES) {
    return createAppError(
      'validation',
      ERROR_CODES.IMAGE_TOO_LARGE,
      'Images must be 5 MB or smaller.',
    );
  }

  return null;
}

export function imageAltFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  const normalized = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  return normalized;
}

export function buildImageStoragePath(
  workspaceId: string,
  imageId: string,
  fileName: string,
): string {
  return `workspaces/${workspaceId}/images/${imageId}-${sanitizeFileName(fileName)}`;
}

export function sanitizeFileName(fileName: string): string {
  const extensionMatch = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  const extension = extensionMatch === null ? '' : `.${extensionMatch[1]}`;
  const baseName = extension.length === 0 ? fileName : fileName.slice(0, -extension.length);

  const normalized = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80 - extension.length);

  return normalized.length === 0 ? `image${extension}` : `${normalized}${extension}`;
}

function isAllowedContentType(contentType: string): boolean {
  return (IMAGE_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType);
}
