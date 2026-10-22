import { isImageElement, type Element } from '../../domain/element';
import { toAppError, type AppError } from '../../shared/errors';
import type { DeleteImage } from '../commands';

export const DEFAULT_IMAGE_CLEANUP_DELAY_MS = 30_000;

export interface OrphanedImageReference {
  readonly storagePath: string;
  readonly src: string;
}

export interface ImageCleanupScheduler {
  schedule(callback: () => void, delayMs: number): () => void;
}

export interface ImageCleanupQueueOptions {
  readonly deleteImage: DeleteImage;
  readonly delayMs?: number;
  readonly scheduler?: ImageCleanupScheduler;
  readonly isStillReferenced?: (image: OrphanedImageReference) => boolean;
  readonly onError?: (error: AppError) => void;
}

export interface ImageCleanupQueue {
  schedule(images: readonly OrphanedImageReference[]): void;
  cancel(storagePaths: readonly string[]): void;
  dispose(): void;
}

interface PendingCleanup {
  readonly image: OrphanedImageReference;
  readonly cancel: () => void;
}

export function collectOrphanedImages(
  previous: readonly Element[],
  next: readonly Element[],
): readonly OrphanedImageReference[] {
  const nextIds = new Set<string>();
  const referencedStoragePaths = new Set<string>();
  const referencedSources = new Set<string>();

  for (const element of next) {
    nextIds.add(element.id.value);

    if (!isImageElement(element)) {
      continue;
    }

    if (element.storagePath !== undefined) {
      referencedStoragePaths.add(element.storagePath);
    }
    referencedSources.add(element.src);
  }

  const orphaned = new Map<string, OrphanedImageReference>();

  for (const element of previous) {
    if (!isImageElement(element) || element.storagePath === undefined) {
      continue;
    }

    if (nextIds.has(element.id.value)) {
      continue;
    }

    if (referencedStoragePaths.has(element.storagePath) || referencedSources.has(element.src)) {
      continue;
    }

    orphaned.set(element.storagePath, {
      storagePath: element.storagePath,
      src: element.src,
    });
  }

  return [...orphaned.values()];
}

export function collectImageStoragePaths(elements: readonly Element[]): readonly string[] {
  const storagePaths = new Set<string>();

  for (const element of elements) {
    if (isImageElement(element) && element.storagePath !== undefined) {
      storagePaths.add(element.storagePath);
    }
  }

  return [...storagePaths];
}

export function isStoragePathInWorkspace(storagePath: string, workspaceId: string): boolean {
  return storagePath.startsWith(`workspaces/${workspaceId}/images/`);
}

export function createImageCleanupQueue(options: ImageCleanupQueueOptions): ImageCleanupQueue {
  const { deleteImage, isStillReferenced, onError } = options;
  const delayMs = normalizeDelayMs(options.delayMs);
  const scheduler: ImageCleanupScheduler = options.scheduler ?? createTimeoutScheduler();
  const pending = new Map<string, PendingCleanup>();
  let disposed = false;

  function execute(entry: PendingCleanup): void {
    pending.delete(entry.image.storagePath);

    if (disposed || isStillReferenced?.(entry.image) === true) {
      return;
    }

    void deleteImage({ storagePath: entry.image.storagePath })
      .then((result) => {
        if (result.status === 'error') {
          onError?.(result.error);
        }
      })
      .catch((error: unknown) => {
        onError?.(toAppError(error));
      });
  }

  return {
    schedule(images) {
      if (disposed) {
        return;
      }

      for (const image of images) {
        if (image.storagePath.trim().length === 0 || pending.has(image.storagePath)) {
          continue;
        }

        const cancel = scheduler.schedule(() => {
          const entry = pending.get(image.storagePath);

          if (entry !== undefined) {
            execute(entry);
          }
        }, delayMs);

        pending.set(image.storagePath, { image, cancel });
      }
    },

    cancel(storagePaths) {
      for (const storagePath of storagePaths) {
        const entry = pending.get(storagePath);

        if (entry === undefined) {
          continue;
        }

        entry.cancel();
        pending.delete(storagePath);
      }
    },

    dispose() {
      disposed = true;

      for (const entry of pending.values()) {
        entry.cancel();
      }
      pending.clear();
    },
  };
}

function normalizeDelayMs(delayMs: number | undefined): number {
  if (delayMs === undefined || !Number.isFinite(delayMs) || delayMs < 0) {
    return DEFAULT_IMAGE_CLEANUP_DELAY_MS;
  }

  return Math.floor(delayMs);
}

function createTimeoutScheduler(): ImageCleanupScheduler {
  return {
    schedule(callback, delayMs) {
      const handle = setTimeout(callback, delayMs);
      return () => clearTimeout(handle);
    },
  };
}
