import {
  createChangeMemberRole,
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createDeleteWorkspace,
  createLeaveWorkspace,
  createRemoveMember,
  createUpdateWorkspace,
  type ChangeMemberRole,
  type CreateWorkspaceWithOwner,
  type DeleteWorkspace,
  type LeaveWorkspace,
  type RemoveMember,
  type UpdateWorkspace,
} from '../../application/commands';
import {
  createGetWorkspace,
  createGetWorkspaceRole,
  createListWorkspaceMembers,
  createListWorkspaces,
  type GetWorkspace,
  type GetWorkspaceRole,
  type ListWorkspaceMembers,
  type ListWorkspaces,
} from '../../application/queries';
import type { MembershipRepository, WorkspaceRepository } from '../../application/ports';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface WorkspaceServices {
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly getWorkspace: GetWorkspace;
  readonly getWorkspaceRole: GetWorkspaceRole;
  readonly deleteWorkspace: DeleteWorkspace;
  readonly changeMemberRole: ChangeMemberRole;
  readonly removeMember: RemoveMember;
  readonly leaveWorkspace: LeaveWorkspace;
  readonly listWorkspaceMembers: ListWorkspaceMembers;
  readonly updateWorkspace: UpdateWorkspace;
}

export function createWorkspaceServices(): WorkspaceServices {
  const db = getFirebaseFirestore();
  const workspaceRepository: WorkspaceRepository = createFirebaseWorkspaceRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);
  return {
    listWorkspaces: createListWorkspaces(workspaceRepository, membershipRepository),
    createWorkspaceWithOwner: createCreateWorkspaceWithOwner({
      workspaceRepository,
      createOwnerMembership: createCreateOwnerMembership(membershipRepository),
    }),
    getWorkspace: createGetWorkspace(workspaceRepository),
    getWorkspaceRole: createGetWorkspaceRole(membershipRepository),
    deleteWorkspace: createDeleteWorkspace({ workspaceRepository, membershipRepository }),
    changeMemberRole: createChangeMemberRole(membershipRepository),
    removeMember: createRemoveMember(membershipRepository),
    leaveWorkspace: createLeaveWorkspace(membershipRepository),
    listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
    updateWorkspace: createUpdateWorkspace(workspaceRepository),
  };
}
