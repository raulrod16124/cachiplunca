import { FakeInvitationRepository } from '../../../fixtures/fake-invitation-repository';
import { describeInvitationRepositoryContract } from '../../../contract/invitation-repository-contract';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';

function makeInvitation(id: string, tokenHash: string, email = 'invitee@example.com'): Invitation {
  return Invitation.create({
    id: InvitationId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    email,
    role: 'editor',
    tokenHash,
    invitedBy: UserId.create('user-1'),
    expiresAt: new Date('2024-01-08T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  });
}

describe('FakeInvitationRepository', () => {
  describeInvitationRepositoryContract('invitation repository contract', () => {
    return new FakeInvitationRepository();
  });

  it('returns the stored instance from findByTokenHash', async () => {
    const repository = new FakeInvitationRepository();
    const invitation = makeInvitation('inv-1', 'hash-1');

    const created = await repository.create(invitation);

    expect(created).toBe(invitation);
    expect(await repository.findByTokenHash('hash-1')).toBe(invitation);
  });

  it('keeps instances independent from each other', async () => {
    const first = new FakeInvitationRepository();
    const second = new FakeInvitationRepository();

    await first.create(makeInvitation('inv-1', 'hash-1'));

    await expect(second.findByTokenHash('hash-1')).resolves.toBeNull();
  });
});
