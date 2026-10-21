export interface ImageUploadFile {
  readonly name: string;
  readonly contentType: string;
  readonly size: number;
  readonly data: ArrayBuffer;
}

export interface ImageUploadRequest {
  readonly storagePath: string;
  readonly file: ImageUploadFile;
}

export interface UploadedImage {
  readonly url: string;
}

export interface DeleteImageRequest {
  readonly storagePath: string;
}

export interface ImageStoragePort {
  uploadImage(request: ImageUploadRequest): Promise<UploadedImage>;
  deleteImage(request: DeleteImageRequest): Promise<void>;
}
