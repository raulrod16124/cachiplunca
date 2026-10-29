import type { ElementId, UserId, WorkspaceId } from '../../domain/shared';
import { UserId as UserIdValue, WorkspaceId as WorkspaceIdValue } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { ElementRepository, MembershipRepository, WorkspaceRepository } from '../ports';
import type { LoadWorkspaceElements } from '../queries';
import {
  buildDuplicateWorkspaceName,
  buildWorkspaceCopyElements,
} from '../services/workspace-duplication';
import type { CreateWorkspaceWithOwner } from './create-workspace-with-owner';

export interface DuplicateWorkspaceInput {
  readonly sourceWorkspaceId: string;
  readonly actorUserId: string;
}

export type DuplicateWorkspaceFieldName = 'sourceWorkspaceId' | 'actorUserId';

export type DuplicateWorkspaceFieldErrors = Partial<Record<DuplicateWorkspaceFieldName, string>>;

export type DuplicateWorkspaceResult =
  | {
      readonly status: 'ok';
      readonly workspace: Workspace;
      readonly copiedElementCount: number;
    }
  | {
      readonly status: 'invalid-input';
      readonly fieldErrors: DuplicateWorkspaceFieldErrors;
    }
  | { readonly status: 'error'; readonly error: AppError };

export type DuplicateWorkspace = (
  input: DuplicateWorkspaceInput,
) => Promise<DuplicateWorkspaceResult>;

export interface DuplicateWorkspaceDeps {
  readonly workspaceRepository: WorkspaceRepository;
  readonly membershipRepository: MembershipRepository;
  readonly elementRepository: ElementRepository;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
}

export function validateDuplicateWorkspaceInput(
  input: DuplicateWorkspaceInput,
): DuplicateWorkspaceFieldErrors {
  const fieldErrors: DuplicateWorkspaceFieldErrors = {};

  if (input.sourceWorkspaceId.trim().length === 0) {
    fieldErrors.sourceWorkspaceId = 'Enter a workspace id.';
  }

  if (input.actorUserId.trim().length === 0) {
    fieldErrors.actorUserId = 'Enter a user id.';
  }

  return fieldErrors;
}

export function createDuplicateWorkspace(deps: DuplicateWorkspaceDeps): DuplicateWorkspace {
  return async (input: DuplicateWorkspaceInput): Promise<DuplicateWorkspaceResult> => {
    const fieldErrors = validateDuplicateWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    const sourceWorkspaceId = WorkspaceIdValue.create(input.sourceWorkspaceId.trim());
    const actorUserId = UserIdValue.create(input.actorUserId.trim());

    try {
      const actor = await deps.membershipRepository.findByUserAndWorkspace(
        actorUserId,
        sourceWorkspaceId,
      );
      if (actor === null || !actor.isOwner()) {
        return { status: 'error', error: forbiddenError(sourceWorkspaceId, actorUserId) };
      }

      const source = await deps.workspaceRepository.findById(sourceWorkspaceId);
      if (source === null) {
        return { status: 'error', error: notFoundError(sourceWorkspaceId) };
      }

      const loaded = await deps.loadWorkspaceElements(source.id.value);
      if (loaded.status === 'error') {
        return loaded;
      }

      const created = await deps.createWorkspaceWithOwner({
        name: buildDuplicateWorkspaceName(source.name),
        description: source.description,
        ownerId: actorUserId,
        type: source.type,
      });
      if (created.status === 'invalid-input') {
        return {
          status: 'error',
          error: createAppError(
            'validation',
            ERROR_CODES.VALIDATION_INVALID_INPUT,
            'The duplicated board name is not valid.',
          ),
        };
      }
      if (created.status === 'error') {
        return created;
      }

      const copy = buildWorkspaceCopyElements(loaded.elements, {
        targetWorkspaceId: created.workspace.id,
        createdBy: actorUserId,
        generateId: deps.generateId,
        now: deps.now,
      });
      if (copy.status === 'error') {
        const rolledBack = await rollback(created.workspace.id, actorUserId, [], deps);
        return { status: 'error', error: annotateRollbackFailure(copy.error, !rolledBack) };
      }

      try {
        await deps.elementRepository.saveMany(copy.elements);
      } catch (error) {
        const rolledBack = await rollback(
          created.workspace.id,
          actorUserId,
          copy.elements.map((element) => element.id),
          deps,
        );
        return {
          status: 'error',
          error: annotateRollbackFailure(toAppError(error), !rolledBack),
        };
      }

      return {
        status: 'ok',
        workspace: created.workspace,
        copiedElementCount: copy.elements.length,
      };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

async function rollback(
  workspaceId: WorkspaceId,
  actorUserId: UserId,
  elementIds: readonly ElementId[],
  deps: DuplicateWorkspaceDeps,
): Promise<boolean> {
  let succeeded = true;

  for (const elementId of elementIds) {
    try {
      const existing = await deps.elementRepository.findById(elementId);
      if (existing !== null) {
        await deps.elementRepository.delete(elementId);
      }
    } catch {
      succeeded = false;
    }
  }

  try {
    await deps.membershipRepository.delete(actorUserId, workspaceId);
  } catch {
    succeeded = false;
  }

  try {
    await deps.workspaceRepository.delete(workspaceId);
  } catch {
    succeeded = false;
  }

  return succeeded;
}

function annotateRollbackFailure(error: AppError, failed: boolean): AppError {
  if (!failed) {
    return error;
  }

  return createAppError(error.kind, error.code, error.message, {
    details: { ...error.details, workspaceRollbackFailed: true },
    cause: error.cause,
  });
}

function forbiddenError(workspaceId: WorkspaceId, actorUserId: UserId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to duplicate this board.',
    {
      details: {
        workspaceId: workspaceId.value,
        actorUserId: actorUserId.value,
      },
    },
  );
}

function notFoundError(workspaceId: WorkspaceId): AppError {
  return createAppError('notFound', ERROR_CODES.NOT_FOUND_RESOURCE, 'The board does not exist.', {
    details: { workspaceId: workspaceId.value },
  });
}
