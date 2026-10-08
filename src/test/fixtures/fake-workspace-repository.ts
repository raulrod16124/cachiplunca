import type {
  WorkspaceCreateInput,
  WorkspaceRepository,
  WorkspaceUpdateInput,
} from '../../application/ports';
import { WorkspaceId } from '../../domain/shared';
import { Workspace } from '../../domain/workspace';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';

export class FakeWorkspaceRepository implements WorkspaceRepository {
  #workspaces = new Map<string, Workspace>();
  #sequence = 0;

  async create(input: WorkspaceCreateInput): Promise<Workspace> {
    const id = WorkspaceId.create(`ws-${++this.#sequence}`);
    const workspace = buildWorkspace(id, input);
    this.#workspaces.set(workspace.id.value, workspace);
    return workspace;
  }

  async list(): Promise<Workspace[]> {
    return [...this.#workspaces.values()];
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    return this.#workspaces.get(id.value) ?? null;
  }

  async update(id: WorkspaceId, updates: WorkspaceUpdateInput): Promise<Workspace> {
    const current = this.#workspaces.get(id.value);
    if (current === undefined) {
      throw notFoundError(id);
    }

    let updated: Workspace;
    try {
      updated = current.update(updates);
    } catch (error) {
      throw toValidationError(error);
    }

    this.#workspaces.set(id.value, updated);
    return updated;
  }

  async delete(id: WorkspaceId): Promise<void> {
    if (!this.#workspaces.delete(id.value)) {
      throw notFoundError(id);
    }
  }
}

function buildWorkspace(id: WorkspaceId, input: WorkspaceCreateInput): Workspace {
  try {
    return Workspace.create({ id, name: input.name, description: input.description });
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid workspace input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function notFoundError(id: WorkspaceId): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The workspace does not exist.',
    {
      details: { workspaceId: id.value },
    },
  );
}
