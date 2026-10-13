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
import { InvitationId, UserId } from '../../../../../../domain/shared';
import { InviteDialog } from '../../../../../../presentation/features/invitations/components/invite-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { FakeInvitationRepository } from '../../../../../fixtures/fake-invitation-repository';

const WORKSPACE_ID = 'ws-1';
const INVITED_BY = UserId.create('user-1');

function buildInviteMember(repository: FakeInvitationRepository): InviteMember {
  let sequence = 0;
  return createInviteMember({
    invitationRepository: repository,
    generateId: () => InvitationId.create(`inv-${(sequence += 1)}`),
    issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });
}

function renderDialog(listPendingInvitations: ListPendingInvitations, inviteMember: InviteMember) {
  const onOpenChange = jest.fn();
  render(
    <InviteDialog
      open
      onOpenChange={onOpenChange}
      workspaceId={WORKSPACE_ID}
      invitedBy={INVITED_BY}
      inviteMember={inviteMember}
      listPendingInvitations={listPendingInvitations}
    />,
  );
  return { onOpenChange };
}

describe('InviteDialog', () => {
  it('loads and shows the empty pending state when opened', async () => {
    const repository = new FakeInvitationRepository();
    renderDialog(createListPendingInvitations(repository), buildInviteMember(repository));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('No pending invitations.')).toBeInTheDocument();
  });

  it('invites a member, reveals the one-time link and refreshes the pending list', async () => {
    const repository = new FakeInvitationRepository();
    renderDialog(createListPendingInvitations(repository), buildInviteMember(repository));
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

    renderDialog(listPendingInvitations, buildInviteMember(repository));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('keeps the dialog open when the invite fails', async () => {
    const repository = new FakeInvitationRepository();
    const inviteMember: InviteMember = async (): Promise<InviteMemberResult> => ({
      status: 'error',
      error: createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw'),
    });
    renderDialog(createListPendingInvitations(repository), inviteMember);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(
      await screen.findByText('You do not have permission to invite members to this workspace.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
