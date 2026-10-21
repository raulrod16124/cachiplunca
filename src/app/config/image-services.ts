import type { ImageServices } from '../../application/image-services';
import { createDeleteImage, createUploadImage } from '../../application/commands';
import { getFirebaseStorage } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseImageStorage } from '../../infrastructure/firebase/firebase-image-storage';

export function createImageServices(): ImageServices {
  const storage = createFirebaseImageStorage(getFirebaseStorage());

  return {
    uploadImage: createUploadImage({
      storage,
      generateImageId: () => crypto.randomUUID(),
    }),
    deleteImage: createDeleteImage({ storage }),
  };
}
