import { fireEvent, render, screen } from '@testing-library/react';
import {
  createInviteMember,
  type InviteMember,
  type InviteMemberResult,
} from '../../../../../../application/commands';
import {
  createListPendingInvitations,
  type ListPendingInvitations,
} from '../../../../../../application/queries';
import { GRANTABLE_ROLES } from '../../../../../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { InvitePanel } from '../../../../../../presentation/features/invitations/components/invite-panel';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { FakeInvitationRepository } from '../../../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../../../fixtures/fake-membership-repository';

const WORKSPACE_ID = 'ws-1';
const INVITED_BY = UserId.create('user-1');

async function buildInviteMember(repository: FakeInvitationRepository): Promise<InviteMember> {
  const membershipRepository = new FakeMembershipRepository();
  await membershipRepository.create({
    userId: INVITED_BY,
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    role: 'owner',
  });
  let sequence = 0;
  return createInviteMember({
    invitationRepository: repository,
    membershipRepository,
    generateId: () => InvitationId.create(`inv-${(sequence += 1)}`),
    issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });
}

function renderPanel(
  listPendingInvitations: ListPendingInvitations,
  inviteMember: InviteMember,
  active = true,
) {
  render(
    <InvitePanel
      active={active}
      workspaceId={WORKSPACE_ID}
      invitedBy={INVITED_BY}
      availableRoles={GRANTABLE_ROLES.owner}
      inviteMember={inviteMember}
      listPendingInvitations={listPendingInvitations}
    />,
  );
}

describe('InvitePanel', () => {
  it('loads and shows the empty pending state when active', async () => {
    const repository = new FakeInvitationRepository();
    renderPanel(createListPendingInvitations(repository), await buildInviteMember(repository));

    expect(await screen.findByText('No pending invitations.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invite people' })).toBeInTheDocument();
    expect(screen.getByText(/Send a one-time invitation/)).toBeInTheDocument();
    expect(screen.getByText('Invitations that have not been accepted yet.')).toBeInTheDocument();
  });

  it('does not load pending invitations while inactive', async () => {
    const repository = new FakeInvitationRepository();
    const listPendingInvitations = jest.fn(createListPendingInvitations(repository));

    renderPanel(listPendingInvitations, await buildInviteMember(repository), false);

    expect(listPendingInvitations).not.toHaveBeenCalled();
  });

  it('invites a member, reveals the one-time link and refreshes the pending list', async () => {
    const repository = new FakeInvitationRepository();
    renderPanel(createListPendingInvitations(repository), await buildInviteMember(repository));
    await screen.findByText('No pending invitations.');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'pending@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText('pending@example.com')).toBeInTheDocument();
    const link = screen.getByLabelText('Invitation link');
    expect((link as HTMLInputElement).value).toContain('/invitations/token-abc');
    expect(screen.queryByText('No pending invitations.')).not.toBeInTheDocument();
  });

  it('shows an error state when the pending list cannot be loaded', async () => {
    const repository = new FakeInvitationRepository();
    const listPendingInvitations: ListPendingInvitations = async () => ({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    });

    renderPanel(listPendingInvitations, await buildInviteMember(repository));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('keeps the form usable and surfaces the error when the invite fails', async () => {
    const repository = new FakeInvitationRepository();
    const inviteMember: InviteMember = async (): Promise<InviteMemberResult> => ({
      status: 'error',
      error: createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw'),
    });
    renderPanel(createListPendingInvitations(repository), inviteMember);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(
      await screen.findByText('You do not have permission to invite members to this board.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeInTheDocument();
  });
});
