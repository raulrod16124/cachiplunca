import type { Invitation, InvitationStatus } from '../../domain/invitation';
import type { InvitationId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

export type PendingInvitationsListener = (invitations: readonly Invitation[]) => void;

export type PendingInvitationsErrorListener = (error: AppError) => void;

export interface InvitationRepository {
  create(invitation: Invitation): Promise<Invitation>;
  findById(id: InvitationId): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string, email?: string): Promise<Invitation | null>;
  listPendingByWorkspace(workspaceId: WorkspaceId): Promise<Invitation[]>;
  listPendingByEmail(email: string): Promise<Invitation[]>;
  watchPendingByEmail(
    email: string,
    listener: PendingInvitationsListener,
    onError?: PendingInvitationsErrorListener,
  ): Unsubscribe;
  updateStatus(id: InvitationId, status: InvitationStatus): Promise<Invitation>;
}
