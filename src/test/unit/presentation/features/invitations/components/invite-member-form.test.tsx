import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInviteMember } from '../../../../../../application/commands';
import { GRANTABLE_ROLES, type MembershipRole } from '../../../../../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import {
  InviteMemberForm,
  type InvitedMemberResult,
} from '../../../../../../presentation/features/invitations/components/invite-member-form';
import { FakeInvitationRepository } from '../../../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../../../fixtures/fake-membership-repository';

const WORKSPACE_ID = 'ws-1';
const INVITED_BY = UserId.create('user-1');

async function buildHarness(availableRoles: readonly MembershipRole[] = GRANTABLE_ROLES.owner) {
  const repository = new FakeInvitationRepository();
  const membershipRepository = new FakeMembershipRepository();
  await membershipRepository.create({
    userId: INVITED_BY,
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    role: 'owner',
  });
  let sequence = 0;
  const inviteMember = createInviteMember({
    invitationRepository: repository,
    membershipRepository,
    generateId: () => InvitationId.create(`inv-${(sequence += 1)}`),
    issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });
  const onInvited = jest.fn<void, [InvitedMemberResult]>();

  render(
    <InviteMemberForm
      workspaceId={WORKSPACE_ID}
      invitedBy={INVITED_BY}
      availableRoles={availableRoles}
      inviteMember={inviteMember}
      onInvited={onInvited}
    />,
  );

  return { repository, onInvited };
}

function fillEmail(email: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
}

describe('InviteMemberForm', () => {
  it('invites the email with the default editor role and reports the one-time token', async () => {
    const { repository, onInvited } = await buildHarness();

    fillEmail('Newcomer@Example.com');
    submit();

    await waitFor(() => expect(onInvited).toHaveBeenCalledTimes(1));
    expect(onInvited.mock.calls[0][0].token).toBe('token-abc');

    const stored = await repository.listPendingByWorkspace(WorkspaceId.create(WORKSPACE_ID));
    expect(stored).toHaveLength(1);
    expect(stored[0].email).toBe('newcomer@example.com');
    expect(stored[0].role).toBe('editor');
    expect(stored[0].tokenHash).toBe('hash-abc');
  });

  it('shows a field error for an invalid email without inviting', async () => {
    const { repository, onInvited } = await buildHarness();

    fillEmail('not-an-email');
    submit();

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-describedby',
      screen.getByText('Enter a valid email address.').id,
    );
    expect(onInvited).not.toHaveBeenCalled();
    await expect(
      repository.listPendingByWorkspace(WorkspaceId.create(WORKSPACE_ID)),
    ).resolves.toEqual([]);
  });

  it('shows every role an owner can grant and selects editor by default', async () => {
    await buildHarness(GRANTABLE_ROLES.owner);

    expect(screen.getByRole('radiogroup', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Owner/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Editor/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Viewer/ })).toBeInTheDocument();
  });

  it('only offers the roles an editor can grant', async () => {
    await buildHarness(GRANTABLE_ROLES.editor);

    expect(screen.getByRole('radio', { name: /^Editor/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Viewer/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^Owner/ })).not.toBeInTheDocument();
  });

  it('falls back to the first available role when editor is not grantable', async () => {
    await buildHarness(['owner', 'viewer']);

    expect(screen.getByRole('radio', { name: /^Owner/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /^Editor/ })).not.toBeInTheDocument();
  });

  it('invites with the chosen viewer role', async () => {
    const { repository } = await buildHarness();

    fireEvent.click(screen.getByRole('radio', { name: /^Viewer/ }));
    fillEmail('viewer@example.com');
    submit();

    await waitFor(async () => {
      const stored = await repository.listPendingByWorkspace(WorkspaceId.create(WORKSPACE_ID));
      expect(stored).toHaveLength(1);
      expect(stored[0].role).toBe('viewer');
    });
  });

  it('invites with the owner role when the actor can grant it', async () => {
    const { repository } = await buildHarness();

    fireEvent.click(screen.getByRole('radio', { name: /^Owner/ }));
    fillEmail('owner@example.com');
    submit();

    await waitFor(async () => {
      const stored = await repository.listPendingByWorkspace(WorkspaceId.create(WORKSPACE_ID));
      expect(stored).toHaveLength(1);
      expect(stored[0].role).toBe('owner');
    });
  });

  it('shows a friendly conflict message when a pending invitation already exists', async () => {
    const { repository, onInvited } = await buildHarness();
    fillEmail('duplicate@example.com');
    submit();
    await waitFor(() => expect(onInvited).toHaveBeenCalledTimes(1));

    fillEmail('duplicate@example.com');
    submit();

    expect(
      await screen.findByText('There is already a pending invitation for this email.'),
    ).toBeInTheDocument();
    expect(onInvited).toHaveBeenCalledTimes(1);
    await expect(
      repository.listPendingByWorkspace(WorkspaceId.create(WORKSPACE_ID)),
    ).resolves.toHaveLength(1);
  });
});
