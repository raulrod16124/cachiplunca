import type { ImageServices } from '../../application/image-services';
import { createUploadImage } from '../../application/commands';
import { getFirebaseStorage } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseImageStorage } from '../../infrastructure/firebase/firebase-image-storage';

export function createImageServices(): ImageServices {
  return {
    uploadImage: createUploadImage({
      storage: createFirebaseImageStorage(getFirebaseStorage()),
      generateImageId: () => crypto.randomUUID(),
    }),
  };
}
