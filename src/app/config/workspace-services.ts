import {
  createChangeMemberRole,
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createDeleteWorkspace,
  createDuplicateWorkspace,
  createLeaveWorkspace,
  createRemoveMember,
  createUpdateWorkspace,
  type ChangeMemberRole,
  type CreateWorkspaceWithOwner,
  type DeleteWorkspace,
  type DuplicateWorkspace,
  type LeaveWorkspace,
  type RemoveMember,
  type UpdateWorkspace,
} from '../../application/commands';
import {
  createGetWorkspace,
  createGetWorkspaceRole,
  createListWorkspaceMembers,
  createListWorkspaces,
  createLoadWorkspaceElements,
  type GetWorkspace,
  type GetWorkspaceRole,
  type ListWorkspaceMembers,
  type ListWorkspaces,
} from '../../application/queries';
import type {
  ElementRepository,
  MembershipRepository,
  WorkspaceRepository,
} from '../../application/ports';
import { ElementId } from '../../domain/shared';
import { createFirebaseElementRepository } from '../../infrastructure/firebase/firebase-element-repository';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export interface WorkspaceServices {
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly duplicateWorkspace: DuplicateWorkspace;
  readonly getWorkspace: GetWorkspace;
  readonly getWorkspaceRole: GetWorkspaceRole;
  readonly deleteWorkspace: DeleteWorkspace;
  readonly changeMemberRole: ChangeMemberRole;
  readonly removeMember: RemoveMember;
  readonly leaveWorkspace: LeaveWorkspace;
  readonly listWorkspaceMembers: ListWorkspaceMembers;
  readonly updateWorkspace: UpdateWorkspace;
}

export interface WorkspaceServicesDeps {
  readonly generateElementId?: () => ElementId;
}

export function createWorkspaceServices(deps: WorkspaceServicesDeps = {}): WorkspaceServices {
  const db = getFirebaseFirestore();
  const workspaceRepository: WorkspaceRepository = createFirebaseWorkspaceRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);
  const elementRepository: ElementRepository = createFirebaseElementRepository(db);
  const generateElementId = deps.generateElementId ?? (() => ElementId.create(crypto.randomUUID()));
  const createWorkspaceWithOwner = createCreateWorkspaceWithOwner({
    workspaceRepository,
    membershipRepository,
    elementRepository,
    createOwnerMembership: createCreateOwnerMembership(membershipRepository),
    generateId: generateElementId,
  });

  return {
    listWorkspaces: createListWorkspaces(workspaceRepository, membershipRepository),
    createWorkspaceWithOwner,
    duplicateWorkspace: createDuplicateWorkspace({
      workspaceRepository,
      membershipRepository,
      elementRepository,
      loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
      createWorkspaceWithOwner,
      generateId: generateElementId,
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
