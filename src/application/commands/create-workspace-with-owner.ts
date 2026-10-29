import type { Element } from '../../domain/element';
import type { ElementId, UserId, WorkspaceId } from '../../domain/shared';
import type { Workspace, WorkspaceType } from '../../domain/workspace';
import { createAppError, toAppError, type AppError } from '../../shared/errors';
import type { ElementRepository, MembershipRepository, WorkspaceRepository } from '../ports';
import {
  buildWorkspaceTemplateInputs,
  type WorkspaceTemplateId,
} from '../services/workspace-templates';
import { createCreateElement } from './create-element';
import { validateCreateWorkspaceInput, type CreateWorkspaceFieldErrors } from './create-workspace';
import type { CreateOwnerMembership } from './create-owner-membership';

export interface CreateWorkspaceWithOwnerInput {
  readonly name: string;
  readonly description?: string | null;
  readonly ownerId: UserId;
  readonly templateId?: WorkspaceTemplateId | null;
  readonly type?: WorkspaceType;
}

export type CreateWorkspaceWithOwnerResult =
  | { readonly status: 'ok'; readonly workspace: Workspace }
  | { readonly status: 'invalid-input'; readonly fieldErrors: CreateWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateWorkspaceWithOwner = (
  input: CreateWorkspaceWithOwnerInput,
) => Promise<CreateWorkspaceWithOwnerResult>;

export interface CreateWorkspaceWithOwnerDeps {
  readonly workspaceRepository: WorkspaceRepository;
  readonly membershipRepository: MembershipRepository;
  readonly elementRepository: ElementRepository;
  readonly createOwnerMembership: CreateOwnerMembership;
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
}

export function createCreateWorkspaceWithOwner(
  deps: CreateWorkspaceWithOwnerDeps,
): CreateWorkspaceWithOwner {
  return async (input: CreateWorkspaceWithOwnerInput): Promise<CreateWorkspaceWithOwnerResult> => {
    const fieldErrors = validateCreateWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    let workspace: Workspace;
    try {
      workspace = await deps.workspaceRepository.create({
        name: input.name.trim(),
        createdBy: input.ownerId,
        description: input.description,
        type: input.type,
      });
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }

    const ownerResult = await deps.createOwnerMembership({
      userId: input.ownerId,
      workspaceId: workspace.id,
    });
    if (ownerResult.status !== 'ok') {
      try {
        await deps.workspaceRepository.delete(workspace.id);
      } catch (compensationError) {
        return {
          status: 'error',
          error: annotateCompensationFailure(ownerResult.error, compensationError),
        };
      }

      return { status: 'error', error: ownerResult.error };
    }

    if (input.templateId === undefined || input.templateId === null) {
      return { status: 'ok', workspace };
    }

    const template = buildTemplateElements(input.templateId, workspace, input.ownerId, deps);
    if (template.status === 'error') {
      const rolledBack = await rollbackWorkspaceCreation(workspace.id, input.ownerId, [], deps);
      return {
        status: 'error',
        error: annotateFailedRollback(template.error, !rolledBack),
      };
    }

    try {
      await deps.elementRepository.saveMany(template.elements);
    } catch (error) {
      const rolledBack = await rollbackWorkspaceCreation(
        workspace.id,
        input.ownerId,
        template.elements.map((element) => element.id),
        deps,
      );
      return {
        status: 'error',
        error: annotateFailedRollback(toAppError(error), !rolledBack),
      };
    }

    return { status: 'ok', workspace };
  };
}

type BuildTemplateElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

function buildTemplateElements(
  templateId: WorkspaceTemplateId,
  workspace: Workspace,
  ownerId: UserId,
  deps: CreateWorkspaceWithOwnerDeps,
): BuildTemplateElementsResult {
  const inputs = buildWorkspaceTemplateInputs(templateId, {
    workspaceId: workspace.id,
    createdBy: ownerId,
  });
  const createElement = createCreateElement({ generateId: deps.generateId, now: deps.now });
  const elements: Element[] = [];

  for (const input of inputs) {
    const result = createElement(input);
    if (result.status === 'error') {
      return result;
    }
    elements.push(result.element);
  }

  return { status: 'ok', elements };
}

async function rollbackWorkspaceCreation(
  workspaceId: WorkspaceId,
  ownerId: UserId,
  elementIds: readonly ElementId[],
  deps: CreateWorkspaceWithOwnerDeps,
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
    await deps.membershipRepository.delete(ownerId, workspaceId);
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

function annotateCompensationFailure(error: AppError, cause: unknown): AppError {
  return createAppError(error.kind, error.code, error.message, {
    details: { ...error.details, workspaceRollbackFailed: true },
    cause,
  });
}

function annotateFailedRollback(error: AppError, failed: boolean): AppError {
  if (!failed) {
    return error;
  }

  return createAppError(error.kind, error.code, error.message, {
    details: { ...error.details, workspaceRollbackFailed: true },
    cause: error.cause,
  });
}
