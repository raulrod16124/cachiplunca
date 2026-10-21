import { toAppError, type AppError } from '../../shared/errors';
import type { ImageStoragePort } from '../ports';

export interface DeleteImageInput {
  readonly storagePath: string;
}

export interface DeleteImageDeps {
  readonly storage: ImageStoragePort;
}

export type DeleteImageResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export type DeleteImage = (input: DeleteImageInput) => Promise<DeleteImageResult>;

export function createDeleteImage(deps: DeleteImageDeps): DeleteImage {
  return async (input: DeleteImageInput): Promise<DeleteImageResult> => {
    if (input.storagePath.trim().length === 0) {
      return {
        status: 'error',
        error: toAppError(new Error('Image storage path cannot be empty')),
      };
    }

    try {
      await deps.storage.deleteImage({ storagePath: input.storagePath });

      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
