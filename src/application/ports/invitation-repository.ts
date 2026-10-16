import type { Invitation, InvitationStatus } from '../../domain/invitation';
import type { InvitationId, WorkspaceId } from '../../domain/shared';

export interface InvitationRepository {
  create(invitation: Invitation): Promise<Invitation>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  listPendingByWorkspace(workspaceId: WorkspaceId): Promise<Invitation[]>;
  updateStatus(id: InvitationId, status: InvitationStatus): Promise<Invitation>;
}
