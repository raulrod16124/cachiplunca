import type { DeleteImage, UploadImage } from './commands';

export interface ImageServices {
  readonly uploadImage: UploadImage;
  readonly deleteImage: DeleteImage;
}
