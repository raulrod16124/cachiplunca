import type { DeleteImage } from '../../../../application/commands';
import {
  collectImageStoragePaths,
  collectOrphanedImages,
  createImageCleanupQueue,
  isStoragePathInWorkspace,
  type OrphanedImageReference,
} from '../../../../application/services';
import { createImageElement, createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { ManualScheduler, flushMicrotasks } from '../../../fixtures/manual-scheduler';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildImage(
  id: string,
  overrides: { readonly src?: string; readonly storagePath?: string } = {},
): Element {
  return createImageElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(240, 160),
    src: overrides.src ?? `https://storage.test/${id}.png`,
    ...(overrides.storagePath === undefined ? {} : { storagePath: overrides.storagePath }),
  });
}

function buildText(id: string): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    content: `content-${id}`,
  });
}

function orphan(storagePath: string, src = `https://storage.test/${storagePath}`) {
  return { storagePath, src };
}

function fakeDeleteImage(result: Awaited<ReturnType<DeleteImage>> = { status: 'ok' }): DeleteImage {
  return jest.fn().mockResolvedValue(result);
}

describe('collectOrphanedImages', () => {
  it('collects a removed image that no other element references', () => {
    const image = buildImage('image-1', {
      storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
    });

    expect(collectOrphanedImages([image], [])).toEqual([
      {
        storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
        src: image.type === 'image' ? image.src : '',
      },
    ]);
  });

  it('does not collect an image whose storage path is still referenced', () => {
    const original = buildImage('image-1', {
      storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
    });
    const copy = buildImage('image-2', {
      src: original.type === 'image' ? original.src : '',
      storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
    });

    expect(collectOrphanedImages([original, copy], [copy])).toEqual([]);
  });

  it('does not collect an image whose src is still referenced without a storage path', () => {
    const original = buildImage('image-1', {
      storagePath: 'workspaces/ws-1/images/image-1-diagram.png',
    });
    const legacyCopy = buildImage('image-2', {
      src: original.type === 'image' ? original.src : '',
    });

    expect(collectOrphanedImages([original, legacyCopy], [legacyCopy])).toEqual([]);
  });

  it('skips legacy images without a storage path', () => {
    const legacy = buildImage('image-1');

    expect(collectOrphanedImages([legacy], [])).toEqual([]);
  });

  it('ignores removed elements that are not images', () => {
    expect(collectOrphanedImages([buildText('text-1')], [])).toEqual([]);
  });

  it('deduplicates candidates that share a storage path', () => {
    const first = buildImage('image-1', {
      src: 'https://storage.test/shared.png',
      storagePath: 'workspaces/ws-1/images/shared.png',
    });
    const second = buildImage('image-2', {
      src: 'https://storage.test/shared.png',
      storagePath: 'workspaces/ws-1/images/shared.png',
    });

    expect(collectOrphanedImages([first, second], [])).toHaveLength(1);
  });
});

describe('collectImageStoragePaths', () => {
  it('returns unique storage paths from image elements', () => {
    const first = buildImage('image-1', {
      storagePath: 'workspaces/ws-1/images/image-1.png',
    });
    const second = buildImage('image-2', {
      storagePath: 'workspaces/ws-1/images/image-1.png',
    });
    const legacy = buildImage('image-3');
    const text = buildText('text-1');

    expect(collectImageStoragePaths([first, second, legacy, text])).toEqual([
      'workspaces/ws-1/images/image-1.png',
    ]);
  });
});

describe('isStoragePathInWorkspace', () => {
  it('matches only paths under the workspace image prefix', () => {
    expect(isStoragePathInWorkspace('workspaces/ws-1/images/a.png', 'ws-1')).toBe(true);
    expect(isStoragePathInWorkspace('workspaces/ws-2/images/a.png', 'ws-1')).toBe(false);
    expect(isStoragePathInWorkspace('workspaces/ws-1/other/a.png', 'ws-1')).toBe(false);
  });
});

describe('createImageCleanupQueue', () => {
  it('deletes scheduled images after the scheduler runs', async () => {
    const scheduler = new ManualScheduler();
    const deleteImage = fakeDeleteImage();
    const queue = createImageCleanupQueue({ deleteImage, scheduler });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    expect(deleteImage).not.toHaveBeenCalled();

    scheduler.run();
    await flushMicrotasks();

    expect(deleteImage).toHaveBeenCalledWith({
      storagePath: 'workspaces/ws-1/images/a.png',
    });
  });

  it('cancels a pending deletion', async () => {
    const scheduler = new ManualScheduler();
    const deleteImage = fakeDeleteImage();
    const queue = createImageCleanupQueue({ deleteImage, scheduler });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    queue.cancel(['workspaces/ws-1/images/a.png']);
    scheduler.run();
    await flushMicrotasks();

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('skips a deletion that became referenced again before execution', async () => {
    const scheduler = new ManualScheduler();
    const deleteImage = fakeDeleteImage();
    const referenced = new Set<string>();
    const queue = createImageCleanupQueue({
      deleteImage,
      scheduler,
      isStillReferenced: (image: OrphanedImageReference) => referenced.has(image.storagePath),
    });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    referenced.add('workspaces/ws-1/images/a.png');
    scheduler.run();
    await flushMicrotasks();

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('deduplicates repeated schedules for the same storage path', async () => {
    const scheduler = new ManualScheduler();
    const deleteImage = fakeDeleteImage();
    const queue = createImageCleanupQueue({ deleteImage, scheduler });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    scheduler.run();
    await flushMicrotasks();

    expect(deleteImage).toHaveBeenCalledTimes(1);
  });

  it('reports failures without throwing', async () => {
    const scheduler = new ManualScheduler();
    const error = createAppError(
      'persistence',
      ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      'Delete failed',
    );
    const onError = jest.fn();
    const queue = createImageCleanupQueue({
      deleteImage: fakeDeleteImage({ status: 'error', error }),
      scheduler,
      onError,
    });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    scheduler.run();
    await flushMicrotasks();

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('cancels all pending deletions when disposed', async () => {
    const scheduler = new ManualScheduler();
    const deleteImage = fakeDeleteImage();
    const queue = createImageCleanupQueue({ deleteImage, scheduler });

    queue.schedule([orphan('workspaces/ws-1/images/a.png')]);
    queue.dispose();
    scheduler.run();
    await flushMicrotasks();

    expect(deleteImage).not.toHaveBeenCalled();
  });
});
