import type { InvitationRepository } from '../../application/ports';
import { Invitation, type InvitationStatus } from '../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../domain/shared';
import { ERROR_CODES, isAppError } from '../../shared/errors';

type RepositoryFactory = () => InvitationRepository | Promise<InvitationRepository>;

const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');
const INVITER = UserId.create('user-1');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const EXPIRES_AT = new Date('2024-01-08T00:00:00.000Z');

function makeInvitation(
  overrides: Partial<Parameters<typeof Invitation.create>[0]> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WORKSPACE,
    email: 'invitee@example.com',
    role: 'editor',
    tokenHash: 'hash-1',
    invitedBy: INVITER,
    expiresAt: EXPIRES_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  });
}

function requireInvitation(invitation: Invitation | null): Invitation {
  if (invitation === null) {
    throw new Error('Expected the repository to return an invitation, got null');
  }
  return invitation;
}

export function describeInvitationRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: InvitationRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts with empty pending listings', async () => {
      await expect(repository.listPendingByWorkspace(WORKSPACE)).resolves.toEqual([]);
      await expect(repository.listPendingByEmail('invitee@example.com')).resolves.toEqual([]);
    });

    it('stores a created invitation and exposes it through findById and findByTokenHash', async () => {
      const invitation = makeInvitation();

      const created = await repository.create(invitation);
      const foundById = await repository.findById(invitation.id);
      const foundByToken = await repository.findByTokenHash('hash-1');

      expect(created).toBeInstanceOf(Invitation);
      expect(requireInvitation(foundById).id.equals(invitation.id)).toBe(true);
      expect(requireInvitation(foundByToken).id.equals(invitation.id)).toBe(true);
    });

    it('returns null from findById and findByTokenHash for unknown values', async () => {
      expect(await repository.findById(InvitationId.create('missing'))).toBeNull();
      expect(await repository.findByTokenHash('missing')).toBeNull();
    });

    it('lists pending invitations by normalized email', async () => {
      const pending = makeInvitation();
      const otherEmail = makeInvitation({
        id: InvitationId.create('inv-2'),
        email: 'other@example.com',
        tokenHash: 'hash-2',
      });
      const accepted = makeInvitation({
        id: InvitationId.create('inv-3'),
        email: 'accepted@example.com',
        tokenHash: 'hash-3',
      }).accept(CREATED_AT);

      await repository.create(pending);
      await repository.create(otherEmail);
      await repository.create(accepted);

      const listed = await repository.listPendingByEmail('  INVITEE@example.com ');

      expect(listed).toHaveLength(1);
      expect(listed[0].id.equals(pending.id)).toBe(true);
    });

    it('watches pending invitations for the authenticated email', async () => {
      const pending = makeInvitation();
      const otherEmail = makeInvitation({
        id: InvitationId.create('inv-2'),
        email: 'other@example.com',
        tokenHash: 'hash-2',
      });
      await repository.create(pending);
      await repository.create(otherEmail);

      const listener = jest.fn();
      const unsubscribe = repository.watchPendingByEmail('  INVITEE@example.com ', listener);

      expect(listener).toHaveBeenCalledTimes(1);
      const [invitations] = listener.mock.calls[0] as [readonly Invitation[]];
      expect(invitations.map((invitation) => invitation.id.value)).toEqual(['inv-1']);

      unsubscribe();
    });

    it('lists only pending invitations of a workspace', async () => {
      const pending = makeInvitation();
      const otherWorkspace = makeInvitation({
        id: InvitationId.create('inv-2'),
        workspaceId: OTHER_WORKSPACE,
        email: 'other@example.com',
        tokenHash: 'hash-2',
      });
      const accepted = makeInvitation({
        id: InvitationId.create('inv-3'),
        email: 'accepted@example.com',
        tokenHash: 'hash-3',
      }).accept(CREATED_AT);

      await repository.create(pending);
      await repository.create(otherWorkspace);
      await repository.create(accepted);

      const listed = await repository.listPendingByWorkspace(WORKSPACE);
      expect(listed).toHaveLength(1);
      expect(listed[0].id.equals(pending.id)).toBe(true);
    });

    it('accepts a pending invitation and stops listing it', async () => {
      const invitation = makeInvitation();
      await repository.create(invitation);

      const updated = await repository.updateStatus(invitation.id, 'accepted');

      expect(updated).not.toBe(invitation);
      expect(updated.status).toBe('accepted');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(invitation.updatedAt.getTime());
      await expect(repository.listPendingByWorkspace(WORKSPACE)).resolves.toEqual([]);
    });

    it('revokes a pending invitation and stops listing it', async () => {
      const invitation = makeInvitation();
      await repository.create(invitation);

      const updated = await repository.updateStatus(invitation.id, 'revoked');

      expect(updated.status).toBe('revoked');
      await expect(repository.listPendingByWorkspace(WORKSPACE)).resolves.toEqual([]);
    });

    it('rejects a duplicate pending invitation with a conflict AppError', async () => {
      await repository.create(makeInvitation());

      await expect(
        repository.create(
          makeInvitation({ id: InvitationId.create('inv-dup'), tokenHash: 'hash-dup' }),
        ),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: ERROR_CODES.INVITATION_ALREADY_EXISTS,
      });
    });

    it('allows a new invitation once the previous one is not pending', async () => {
      const first = makeInvitation();
      await repository.create(first);
      await repository.updateStatus(first.id, 'revoked');

      const second = makeInvitation({
        id: InvitationId.create('inv-2'),
        tokenHash: 'hash-2',
      });

      await expect(repository.create(second)).resolves.toBeInstanceOf(Invitation);
      await expect(repository.listPendingByWorkspace(WORKSPACE)).resolves.toHaveLength(1);
    });

    it('rejects a duplicate invitation id with a conflict AppError', async () => {
      await repository.create(makeInvitation());

      await expect(
        repository.create(makeInvitation({ email: 'other@example.com', tokenHash: 'hash-2' })),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: ERROR_CODES.INVITATION_ALREADY_EXISTS,
      });
    });

    it('rejects updateStatus with a notFound AppError for an unknown invitation', async () => {
      await expect(
        repository.updateStatus(InvitationId.create('missing'), 'accepted'),
      ).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects an unsupported status transition with a validation AppError', async () => {
      const invitation = makeInvitation();
      await repository.create(invitation);

      await expect(
        repository.updateStatus(invitation.id, 'pending' as InvitationStatus),
      ).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
    });

    it('rejects every failing operation with an AppError instead of a raw error', async () => {
      const invitation = makeInvitation();
      await repository.create(invitation);

      const operations = [
        repository.create(makeInvitation()),
        repository.updateStatus(InvitationId.create('missing'), 'accepted'),
        repository.updateStatus(invitation.id, 'pending' as InvitationStatus),
      ];

      for (const operation of operations) {
        const error: unknown = await operation.catch((reason: unknown) => reason);
        expect(isAppError(error)).toBe(true);
      }
    });
  });
}
