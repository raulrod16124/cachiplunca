import type { ImageStoragePort, ImageUploadRequest, UploadedImage } from '../../application/ports';

export interface FakeImageStoragePort extends ImageStoragePort {
  readonly uploads: readonly ImageUploadRequest[];
}

export function createFakeImageStoragePort(): FakeImageStoragePort {
  const uploads: ImageUploadRequest[] = [];

  return {
    uploads,
    async uploadImage(request: ImageUploadRequest): Promise<UploadedImage> {
      uploads.push(request);
      return { url: `https://storage.test/${request.storagePath}` };
    },
  };
}
