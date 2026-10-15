import type { Membership, MembershipRole } from '../../domain/membership';
import type { InvitationId, UserId, WorkspaceId } from '../../domain/shared';

export interface MembershipCreateInput {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly role: MembershipRole;
  readonly invitationId?: InvitationId;
}

export interface MembershipRepository {
  create(input: MembershipCreateInput): Promise<Membership>;
  findByUserAndWorkspace(userId: UserId, workspaceId: WorkspaceId): Promise<Membership | null>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Membership[]>;
  listByUser(userId: UserId): Promise<Membership[]>;
  updateRole(userId: UserId, workspaceId: WorkspaceId, role: MembershipRole): Promise<Membership>;
  delete(userId: UserId, workspaceId: WorkspaceId): Promise<void>;
}
