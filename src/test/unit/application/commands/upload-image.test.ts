import { createUploadImage } from '../../../../application/commands';
import type { ImageStoragePort, ImageUploadFile } from '../../../../application/ports';
import { WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const WORKSPACE = WorkspaceId.create('ws-1');

function file(overrides: Partial<ImageUploadFile> = {}): ImageUploadFile {
  return {
    name: 'diagram.png',
    contentType: 'image/png',
    size: 2048,
    data: new ArrayBuffer(8),
    ...overrides,
  };
}

function fakeStorage(): ImageStoragePort & { readonly calls: unknown[] } {
  const calls: unknown[] = [];

  return {
    calls,
    async uploadImage(request) {
      calls.push(request);
      return { url: `https://storage.example/${request.storagePath}` };
    },
  };
}

describe('createUploadImage', () => {
  it('uploads a valid file under a workspace-scoped path', async () => {
    const storage = fakeStorage();
    const uploadImage = createUploadImage({
      storage,
      generateImageId: () => 'image-1',
    });

    const result = await uploadImage({ workspaceId: WORKSPACE, file: file() });

    expect(result).toEqual({
      status: 'ok',
      image: {
        url: 'https://storage.example/workspaces/ws-1/images/image-1-diagram.png',
        storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
      },
    });
    expect(storage.calls).toHaveLength(1);
  });

  it('rejects invalid types without touching storage', async () => {
    const storage = fakeStorage();
    const uploadImage = createUploadImage({ storage, generateImageId: () => 'image-1' });

    const result = await uploadImage({
      workspaceId: WORKSPACE,
      file: file({ contentType: 'application/pdf' }),
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { code: ERROR_CODES.IMAGE_INVALID_TYPE },
    });
    expect(storage.calls).toHaveLength(0);
  });

  it('maps storage failures to an app error', async () => {
    const uploadImage = createUploadImage({
      storage: {
        async uploadImage() {
          throw new Error('storage down');
        },
      },
      generateImageId: () => 'image-1',
    });

    const result = await uploadImage({ workspaceId: WORKSPACE, file: file() });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('storage down');
    }
  });
});
