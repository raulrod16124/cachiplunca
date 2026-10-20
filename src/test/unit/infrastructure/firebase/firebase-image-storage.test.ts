import type { FirebaseStorage } from 'firebase/storage';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { createFirebaseImageStorage } from '../../../../infrastructure/firebase/firebase-image-storage';
import { ERROR_CODES } from '../../../../shared/errors';

jest.mock('firebase/storage', () => ({
  ref: jest.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

const refMock = ref as jest.MockedFunction<typeof ref>;
const uploadBytesMock = uploadBytes as jest.MockedFunction<typeof uploadBytes>;
const getDownloadURLMock = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>;

const storage = {} as FirebaseStorage;

function file() {
  return {
    name: 'diagram.png',
    contentType: 'image/png',
    size: 3,
    data: new Uint8Array([1, 2, 3]).buffer,
  };
}

describe('createFirebaseImageStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDownloadURLMock.mockResolvedValue('https://storage.example/image.png');
  });

  it('uploads the bytes with the content type and returns the download URL', async () => {
    const port = createFirebaseImageStorage(storage);

    const uploaded = await port.uploadImage({
      storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
      file: file(),
    });

    expect(refMock).toHaveBeenCalledWith(storage, 'workspaces/ws-1/images/image-1-diagram.png');
    expect(uploadBytesMock).toHaveBeenCalledWith(
      { path: 'workspaces/ws-1/images/image-1-diagram.png' },
      expect.any(ArrayBuffer),
      { contentType: 'image/png', customMetadata: { originalName: 'diagram.png' } },
    );
    expect(uploaded).toEqual({ url: 'https://storage.example/image.png' });
  });

  it('maps storage errors through the Firebase error mapper', async () => {
    uploadBytesMock.mockRejectedValue({ code: 'storage/unauthorized' });
    const port = createFirebaseImageStorage(storage);

    await expect(
      port.uploadImage({
        storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
        file: file(),
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });
});
