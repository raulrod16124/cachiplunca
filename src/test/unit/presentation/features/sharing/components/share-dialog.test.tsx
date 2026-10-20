import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createChangeMemberRole,
  createCreateGuestLink,
  createInviteMember,
  createLeaveWorkspace,
  createRemoveMember,
  createRevokeGuestLink,
  type ChangeMemberRole,
} from '../../../../../../application/commands';
import {
  createListActiveGuestLinks,
  createListPendingInvitations,
  createListWorkspaceMembers,
} from '../../../../../../application/queries';
import type { GuestLinkServices } from '../../../../../../application/guest-link-services';
import type { MembershipRole } from '../../../../../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { ShareDialog } from '../../../../../../presentation/features/sharing/components/share-dialog';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { FakeInvitationRepository } from '../../../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../../../fixtures/fake-membership-repository';
import { FakeGuestLinkRepository } from '../../../../../fixtures/fake-guest-link-repository';

const WORKSPACE_ID = 'ws-1';
const CURRENT_USER_ID = 'user-a';

async function seed(
  repository: FakeMembershipRepository,
  userId: string,
  role: MembershipRole,
): Promise<void> {
  await repository.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    role,
  });
}

interface RenderOptions {
  readonly canInvite?: boolean;
  readonly canChangeRole?: boolean;
  readonly canRemove?: boolean;
  readonly canLeave?: boolean;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly inviteMember?: ReturnType<typeof createInviteMember>;
  readonly listPendingInvitations?: ReturnType<typeof createListPendingInvitations>;
  readonly guestLinks?: GuestLinkServices;
  readonly canManageGuestLinks?: boolean;
}

function renderDialog(repository: FakeMembershipRepository, options: RenderOptions = {}) {
  const onOpenChange = jest.fn();
  const onLeft = jest.fn();
  render(
    <ShareDialog
      open
      onOpenChange={onOpenChange}
      workspaceId={WORKSPACE_ID}
      currentUserId={CURRENT_USER_ID}
      canInvite={options.canInvite ?? false}
      canChangeRole={options.canChangeRole ?? true}
      canRemove={options.canRemove ?? true}
      canLeave={options.canLeave ?? true}
      listWorkspaceMembers={createListWorkspaceMembers(repository)}
      leaveWorkspace={createLeaveWorkspace(repository)}
      changeMemberRole={options.changeMemberRole ?? createChangeMemberRole(repository)}
      removeMember={createRemoveMember(repository)}
      inviteMember={options.inviteMember}
      listPendingInvitations={options.listPendingInvitations}
      guestLinks={options.guestLinks}
      canManageGuestLinks={options.canManageGuestLinks}
      onLeft={onLeft}
    />,
  );
  return { onOpenChange, onLeft };
}

describe('ShareDialog', () => {
  it('loads the members of the workspace on open', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    await seed(repository, 'user-b', 'editor');

    renderDialog(repository);

    expect(await screen.findByText('user-b')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('moves focus into the dialog when it opens', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');

    renderDialog(repository);

    expect(await screen.findByRole('dialog')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    const { onOpenChange } = renderDialog(repository);
    const user = userEvent.setup();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows an error state when members cannot be loaded', async () => {
    const repository = new FakeMembershipRepository();
    const listWorkspaceMembers = async () => ({
      status: 'error' as const,
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    });

    render(
      <ShareDialog
        open
        onOpenChange={jest.fn()}
        workspaceId={WORKSPACE_ID}
        currentUserId={CURRENT_USER_ID}
        canInvite={false}
        canChangeRole
        canRemove
        canLeave
        listWorkspaceMembers={listWorkspaceMembers}
        leaveWorkspace={createLeaveWorkspace(repository)}
        onLeft={jest.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('changes a member role and refreshes the list', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    await seed(repository, 'user-b', 'editor');

    renderDialog(repository);
    await screen.findByText('user-b');

    fireEvent.click(screen.getByRole('combobox', { name: 'Role for user-b' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Viewer' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Role for user-b' })).toHaveTextContent('Viewer'),
    );
  });

  it('removes a member and refreshes the list', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    await seed(repository, 'user-b', 'editor');

    renderDialog(repository);
    await screen.findByText('user-b');

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.queryByText('user-b')).not.toBeInTheDocument());
  });

  it('leaves the workspace and notifies the caller', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'viewer');

    const { onLeft } = renderDialog(repository, { canChangeRole: false, canRemove: false });
    await screen.findByText('You');

    fireEvent.click(screen.getByRole('button', { name: 'Leave workspace' }));

    await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
  });

  it('surfaces a friendly message when the role change is forbidden', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    await seed(repository, 'user-b', 'editor');
    const changeMemberRole: ChangeMemberRole = async () => ({
      status: 'error',
      error: createAppError('authorization', ERROR_CODES.AUTH_FORBIDDEN, 'raw'),
    });

    renderDialog(repository, { changeMemberRole });
    await screen.findByText('user-b');

    fireEvent.click(screen.getByRole('combobox', { name: 'Role for user-b' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Viewer' }));

    expect(
      await screen.findByText(
        'You do not have permission to change member roles in this workspace.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the invite tab only when invitation services and permission are available', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');
    const invitationRepository = new FakeInvitationRepository();
    const inviteMember = createInviteMember({
      invitationRepository,
      membershipRepository: repository,
      generateId: () => InvitationId.create('inv-1'),
      issueToken: async () => ({ token: 'token-abc', tokenHash: 'hash-abc' }),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    renderDialog(repository, {
      canInvite: true,
      inviteMember,
      listPendingInvitations: createListPendingInvitations(invitationRepository),
    });

    expect(await screen.findByRole('tab', { name: 'Invite' })).toBeInTheDocument();
    expect(await screen.findByText('No pending invitations.')).toBeInTheDocument();
  });

  it('hides the invite tab when permission is missing', async () => {
    const repository = new FakeMembershipRepository();
    await seed(repository, CURRENT_USER_ID, 'viewer');

    renderDialog(repository, { canInvite: false, canChangeRole: false, canRemove: false });

    await screen.findByText('You');
    expect(screen.queryByRole('tab', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('shows the read-only link tab to owners when guest link services are available', async () => {
    const repository = new FakeMembershipRepository();
    const guestLinks = new FakeGuestLinkRepository();
    await seed(repository, CURRENT_USER_ID, 'owner');

    const services: GuestLinkServices = {
      createGuestLink: createCreateGuestLink({
        guestLinkRepository: guestLinks,
        membershipRepository: repository,
        issueToken: async () => ({ token: 'token-1', tokenHash: 'a'.repeat(64) }),
      }),
      revokeGuestLink: createRevokeGuestLink({
        guestLinkRepository: guestLinks,
        membershipRepository: repository,
      }),
      listActiveGuestLinks: createListActiveGuestLinks({
        guestLinkRepository: guestLinks,
        membershipRepository: repository,
      }),
      openGuestWorkspace: async () => ({ status: 'invalid' }),
    };

    renderDialog(repository, { guestLinks: services, canManageGuestLinks: true });
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: 'View link' }));

    expect(await screen.findByRole('heading', { name: 'Read-only link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create view link' })).toBeInTheDocument();
  });
});
