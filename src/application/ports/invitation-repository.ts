import type { Invitation, InvitationStatus } from '../../domain/invitation';
import type { InvitationId, WorkspaceId } from '../../domain/shared';

export interface InvitationRepository {
  create(invitation: Invitation): Promise<Invitation>;
  findById(id: InvitationId): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string, email?: string): Promise<Invitation | null>;
  listPendingByWorkspace(workspaceId: WorkspaceId): Promise<Invitation[]>;
  listPendingByEmail(email: string): Promise<Invitation[]>;
  updateStatus(id: InvitationId, status: InvitationStatus): Promise<Invitation>;
}
