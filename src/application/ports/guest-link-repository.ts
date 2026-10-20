import type { GuestLink } from '../../domain/guest-link';
import type { UserId, WorkspaceId } from '../../domain/shared';

export interface GuestSessionInput {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly tokenHash: string;
}

export interface GuestLinkRepository {
  create(link: GuestLink): Promise<GuestLink>;
  findByTokenHash(tokenHash: string): Promise<GuestLink | null>;
  listActiveByWorkspace(workspaceId: WorkspaceId): Promise<GuestLink[]>;
  revoke(tokenHash: string): Promise<GuestLink>;
  openSession(input: GuestSessionInput): Promise<void>;
}
