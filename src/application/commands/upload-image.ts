import type { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { ImageStoragePort, ImageUploadFile } from '../ports';
import { buildImageStoragePath, validateImageUploadFile } from '../services/image-upload';

export interface UploadImageInput {
  readonly workspaceId: WorkspaceId;
  readonly file: ImageUploadFile;
}

export interface UploadImageDeps {
  readonly storage: ImageStoragePort;
  readonly generateImageId: () => string;
}

export interface UploadedImageReference {
  readonly url: string;
  readonly storagePath: string;
}

export type UploadImageResult =
  | { readonly status: 'ok'; readonly image: UploadedImageReference }
  | { readonly status: 'error'; readonly error: AppError };

export type UploadImage = (input: UploadImageInput) => Promise<UploadImageResult>;

export function createUploadImage(deps: UploadImageDeps): UploadImage {
  return async (input: UploadImageInput): Promise<UploadImageResult> => {
    const validationError = validateImageUploadFile(input.file);

    if (validationError !== null) {
      return { status: 'error', error: validationError };
    }

    const storagePath = buildImageStoragePath(
      input.workspaceId.value,
      deps.generateImageId(),
      input.file.name,
    );

    try {
      const uploaded = await deps.storage.uploadImage({ storagePath, file: input.file });

      return { status: 'ok', image: { url: uploaded.url, storagePath } };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
