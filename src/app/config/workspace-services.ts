import {
  createListWorkspaces,
  type ListWorkspaces,
} from '../../application/queries/list-workspaces';
import type { WorkspaceRepository } from '../../application/ports';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface WorkspaceServices {
  readonly listWorkspaces: ListWorkspaces;
}

export function createWorkspaceServices(): WorkspaceServices {
  const workspaceRepository: WorkspaceRepository =
    createFirebaseWorkspaceRepository(getFirebaseFirestore());
  return {
    listWorkspaces: createListWorkspaces(workspaceRepository),
  };
}
