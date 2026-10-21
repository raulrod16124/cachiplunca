import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';
import type {
  DeleteImageRequest,
  ImageStoragePort,
  ImageUploadRequest,
  UploadedImage,
} from '../../application/ports';
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

    async deleteImage({ storagePath }: DeleteImageRequest): Promise<void> {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (error) {
        if (isObjectNotFound(error)) {
          return;
        }

        throw mapFirebaseError(error);
      }
    },
  };
}

function isObjectNotFound(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === 'storage/object-not-found'
  );
}
