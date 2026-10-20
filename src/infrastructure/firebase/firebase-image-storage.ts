import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { ImageStoragePort, ImageUploadRequest, UploadedImage } from '../../application/ports';
import { mapFirebaseError } from './firebase-error-mapper';

export function createFirebaseImageStorage(storage: FirebaseStorage): ImageStoragePort {
  return {
    async uploadImage({ storagePath, file }: ImageUploadRequest): Promise<UploadedImage> {
      try {
        const objectRef = ref(storage, storagePath);

        await uploadBytes(objectRef, file.data, {
          contentType: file.contentType,
          customMetadata: { originalName: file.name },
        });

        return { url: await getDownloadURL(objectRef) };
      } catch (error) {
        throw mapFirebaseError(error);
      }
    },
  };
}
