import type { Element } from '../../domain/element';
import type { ElementId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { ElementRepository } from '../ports';

export type PersistElementMutationResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export interface ElementPersistence {
  save(element: Element): Promise<PersistElementMutationResult>;
  saveMany(elements: readonly Element[]): Promise<PersistElementMutationResult>;
  remove(id: ElementId): Promise<PersistElementMutationResult>;
  removeMany(ids: readonly ElementId[]): Promise<PersistElementMutationResult>;
}

export function createElementPersistence(elementRepository: ElementRepository): ElementPersistence {
  return {
    async save(element: Element): Promise<PersistElementMutationResult> {
      return run(async () => {
        await elementRepository.save(element);
      });
    },

    async saveMany(elements: readonly Element[]): Promise<PersistElementMutationResult> {
      if (elements.length === 0) {
        return { status: 'ok' };
      }

      return run(async () => {
        await elementRepository.saveMany(elements);
      });
    },

    async remove(id: ElementId): Promise<PersistElementMutationResult> {
      return run(async () => {
        await elementRepository.delete(id);
      });
    },

    async removeMany(ids: readonly ElementId[]): Promise<PersistElementMutationResult> {
      if (ids.length === 0) {
        return { status: 'ok' };
      }

      return run(async () => {
        await elementRepository.deleteMany(ids);
      });
    },
  };
}

async function run(operation: () => Promise<void>): Promise<PersistElementMutationResult> {
  try {
    await operation();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', error: toAppError(error) };
  }
}
