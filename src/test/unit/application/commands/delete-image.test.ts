import { createDeleteImage } from '../../../../application/commands';
import type { DeleteImageRequest, ImageStoragePort } from '../../../../application/ports';
import { ERROR_CODES } from '../../../../shared/errors';

const STORAGE_PATH = 'workspaces/ws-1/images/image-1-diagram.png';

interface FakeStorage extends ImageStoragePort {
  readonly deleted: readonly DeleteImageRequest[];
  fail: boolean;
}

function fakeStorage(): FakeStorage {
  const deleted: DeleteImageRequest[] = [];
  const storage: FakeStorage = {
    deleted,
    fail: false,
    async uploadImage() {
      return { url: 'https://storage.example/image.png' };
    },
    async deleteImage(request) {
      if (storage.fail) {
        throw new Error('Storage delete failed');
      }
      deleted.push(request);
    },
  };

  return storage;
}

describe('createDeleteImage', () => {
  it('deletes the object through the storage port', async () => {
    const storage = fakeStorage();
    const deleteImage = createDeleteImage({ storage });

    const result = await deleteImage({ storagePath: STORAGE_PATH });

    expect(result).toEqual({ status: 'ok' });
    expect(storage.deleted).toEqual([{ storagePath: STORAGE_PATH }]);
  });

  it('rejects an empty storage path without touching storage', async () => {
    const storage = fakeStorage();
    const deleteImage = createDeleteImage({ storage });

    const result = await deleteImage({ storagePath: '   ' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('Image storage path cannot be empty');
    }
    expect(storage.deleted).toHaveLength(0);
  });

  it('maps storage failures to an app error', async () => {
    const storage = fakeStorage();
    storage.fail = true;
    const deleteImage = createDeleteImage({ storage });

    const result = await deleteImage({ storagePath: STORAGE_PATH });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
      expect(result.error.message).toBe('Storage delete failed');
    }
  });
});
