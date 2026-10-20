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

  it('notifies watchers of the matching email on create and status changes', async () => {
    const repository = new FakeInvitationRepository();
    const listener = jest.fn();
    const unsubscribe = repository.watchPendingByEmail(' INVITEE@example.com ', listener);

    expect(listener).toHaveBeenLastCalledWith([]);

    const invitation = makeInvitation('inv-1', 'hash-1');
    await repository.create(invitation);
    expect(listener).toHaveBeenLastCalledWith([invitation]);

    await repository.updateStatus(invitation.id, 'accepted');
    expect(listener).toHaveBeenLastCalledWith([]);

    unsubscribe();
    await repository.create(makeInvitation('inv-2', 'hash-2'));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('does not notify watchers subscribed to another email', async () => {
    const repository = new FakeInvitationRepository();
    const listener = jest.fn();
    const unsubscribe = repository.watchPendingByEmail('other@example.com', listener);

    await repository.create(makeInvitation('inv-1', 'hash-1'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith([]);

    unsubscribe();
  });
});
