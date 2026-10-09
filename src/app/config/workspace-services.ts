import { createCreateWorkspace, type CreateWorkspace } from '../../application/commands';
import {
  createGetWorkspace,
  createListWorkspaces,
  type GetWorkspace,
  type ListWorkspaces,
} from '../../application/queries';
import type { WorkspaceRepository } from '../../application/ports';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface WorkspaceServices {
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspace: CreateWorkspace;
  readonly getWorkspace: GetWorkspace;
}

export function createWorkspaceServices(): WorkspaceServices {
  const workspaceRepository: WorkspaceRepository =
    createFirebaseWorkspaceRepository(getFirebaseFirestore());
  return {
    listWorkspaces: createListWorkspaces(workspaceRepository),
    createWorkspace: createCreateWorkspace(workspaceRepository),
    getWorkspace: createGetWorkspace(workspaceRepository),
  };
}
