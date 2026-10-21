import type {
  DeleteImageRequest,
  ImageStoragePort,
  ImageUploadRequest,
  UploadedImage,
} from '../../application/ports';

export interface FakeImageStoragePort extends ImageStoragePort {
  readonly uploads: readonly ImageUploadRequest[];
  readonly deletes: readonly DeleteImageRequest[];
  readonly failDeletes: boolean;
}

export interface FakeImageStoragePortOptions {
  readonly failDeletes?: boolean;
}

export function createFakeImageStoragePort(
  options: FakeImageStoragePortOptions = {},
): FakeImageStoragePort {
  const uploads: ImageUploadRequest[] = [];
  const deletes: DeleteImageRequest[] = [];

  return {
    uploads,
    deletes,
    failDeletes: options.failDeletes === true,
    async uploadImage(request: ImageUploadRequest): Promise<UploadedImage> {
      uploads.push(request);
      return { url: `https://storage.test/${request.storagePath}` };
    },
    async deleteImage(request: DeleteImageRequest): Promise<void> {
      if (options.failDeletes === true) {
        throw new Error('Storage delete failed');
      }
      deletes.push(request);
    },
  };
}
