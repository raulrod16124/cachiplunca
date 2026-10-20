import type { GuestSessionInput, GuestLinkRepository } from '../../application/ports';
import type { GuestLink } from '../../domain/guest-link';
import type { WorkspaceId } from '../../domain/shared';

export class FakeGuestLinkRepository implements GuestLinkRepository {
  readonly #links = new Map<string, GuestLink>();
  readonly #sessions = new Map<string, GuestSessionInput>();

  async create(link: GuestLink): Promise<GuestLink> {
    if (this.#links.has(link.tokenHash)) {
      throw new Error('Guest link already exists');
    }
    this.#links.set(link.tokenHash, link);
    return link;
  }

  async findByTokenHash(tokenHash: string): Promise<GuestLink | null> {
    return this.#links.get(tokenHash) ?? null;
  }

  async listActiveByWorkspace(workspaceId: WorkspaceId): Promise<GuestLink[]> {
    return [...this.#links.values()].filter(
      (link) => link.workspaceId.equals(workspaceId) && link.isActive(),
    );
  }

  async revoke(tokenHash: string): Promise<GuestLink> {
    const link = this.#links.get(tokenHash);
    if (link === undefined) {
      throw new Error('Guest link not found');
    }
    const revoked = link.revoke();
    this.#links.set(tokenHash, revoked);
    return revoked;
  }

  async openSession(input: GuestSessionInput): Promise<void> {
    this.#sessions.set(input.userId.value, input);
  }

  getSession(userId: string): GuestSessionInput | undefined {
    return this.#sessions.get(userId);
  }

  seed(link: GuestLink): void {
    this.#links.set(link.tokenHash, link);
  }
}
