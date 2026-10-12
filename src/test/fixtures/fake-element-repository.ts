import type { ElementRepository } from '../../application/ports';
import { validateElement, type Element } from '../../domain/element';
import type { ElementId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';

export class FakeElementRepository implements ElementRepository {
  #elements = new Map<string, Element>();

  async listByWorkspace(workspaceId: WorkspaceId): Promise<Element[]> {
    return [...this.#elements.values()].filter((element) =>
      element.workspaceId.equals(workspaceId),
    );
  }

  async findById(id: ElementId): Promise<Element | null> {
    return this.#elements.get(id.value) ?? null;
  }

  async save(element: Element): Promise<Element> {
    const validated = assertValidElement(element);
    this.#elements.set(validated.id.value, validated);
    return validated;
  }

  async saveMany(elements: readonly Element[]): Promise<Element[]> {
    const validated = elements.map(assertValidElement);
    for (const element of validated) {
      this.#elements.set(element.id.value, element);
    }
    return validated;
  }

  async delete(id: ElementId): Promise<void> {
    if (!this.#elements.delete(id.value)) {
      throw notFoundError(id);
    }
  }

  async deleteMany(ids: readonly ElementId[]): Promise<void> {
    for (const id of ids) {
      if (!this.#elements.has(id.value)) {
        throw notFoundError(id);
      }
    }
    for (const id of ids) {
      this.#elements.delete(id.value);
    }
  }
}

function assertValidElement(element: Element): Element {
  try {
    validateElement(element);
    return element;
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid element input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function notFoundError(id: ElementId): AppError {
  return createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'The element does not exist.', {
    details: { elementId: id.value },
  });
}
