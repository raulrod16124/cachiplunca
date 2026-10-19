import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AcceptInvitationById } from '../../../../../../application/commands';
import type { ListPendingInvitationsForUser } from '../../../../../../application/queries';
import { Invitation } from '../../../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';
import { PendingInvitationsPanel } from '../../../../../../presentation/features/workspaces/components/pending-invitations-panel';

const USER_ID = 'user-1';
const USER_EMAIL = 'invitee@example.com';
const USER_EMAIL_VERIFIED = true;
const WORKSPACE = WorkspaceId.create('ws-1');

function makeInvitation(): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WORKSPACE,
    email: USER_EMAIL,
    role: 'editor',
    tokenHash: 'hash-1',
    invitedBy: UserId.create('owner-1'),
    expiresAt: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function setup(
  overrides: {
    list?: ListPendingInvitationsForUser;
    accept?: AcceptInvitationById;
    onAccepted?: (workspaceId: string) => void;
  } = {},
) {
  const listPendingInvitationsForUser: ListPendingInvitationsForUser =
    overrides.list ??
    jest.fn().mockResolvedValue({ status: 'ok', invitations: [makeInvitation()] });
  const acceptInvitationById: AcceptInvitationById =
    overrides.accept ??
    jest.fn().mockResolvedValue({ status: 'ok', workspaceId: WORKSPACE, role: 'editor' });
  const onAccepted = overrides.onAccepted ?? jest.fn();

  render(
    <PendingInvitationsPanel
      userId={USER_ID}
      userEmail={USER_EMAIL}
      userEmailVerified={USER_EMAIL_VERIFIED}
      listPendingInvitationsForUser={listPendingInvitationsForUser}
      acceptInvitationById={acceptInvitationById}
      onAccepted={onAccepted}
    />,
  );

  return { listPendingInvitationsForUser, acceptInvitationById, onAccepted };
}

describe('PendingInvitationsPanel', () => {
  it('shows the invited workspace and role', async () => {
    setup();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pending invitations' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/A workspace/)).toBeInTheDocument();
    expect(await screen.findByText(/editor/i)).toBeInTheDocument();
  });

  it('accepts the invitation and reports the workspace id', async () => {
    const user = userEvent.setup();
    const onAccepted = jest.fn();
    const { acceptInvitationById } = setup({ onAccepted });

    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }));

    await waitFor(() => {
      expect(acceptInvitationById).toHaveBeenCalledWith({
        invitationId: InvitationId.create('inv-1'),
        userId: UserId.create(USER_ID),
        userEmail: USER_EMAIL,
        userEmailVerified: true,
      });
      expect(onAccepted).toHaveBeenCalledWith(WORKSPACE.value);
    });
  });

  it('renders nothing when there are no pending invitations', async () => {
    const { container } = render(
      <PendingInvitationsPanel
        userId={USER_ID}
        userEmail={USER_EMAIL}
        userEmailVerified={USER_EMAIL_VERIFIED}
        listPendingInvitationsForUser={jest.fn().mockResolvedValue({
          status: 'ok',
          invitations: [],
        })}
        acceptInvitationById={jest.fn()}
        onAccepted={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('shows a retry action when loading invitations fails', async () => {
    const user = userEvent.setup();
    const listPendingInvitationsForUser = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'error',
        error: createAppError(
          'network',
          ERROR_CODES.NETWORK_REQUEST_FAILED,
          'The network connection was lost.',
        ),
      })
      .mockResolvedValueOnce({ status: 'ok', invitations: [makeInvitation()] });

    render(
      <PendingInvitationsPanel
        userId={USER_ID}
        userEmail={USER_EMAIL}
        userEmailVerified={USER_EMAIL_VERIFIED}
        listPendingInvitationsForUser={listPendingInvitationsForUser}
        acceptInvitationById={jest.fn()}
        onAccepted={jest.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pending invitations' }),
    ).toBeInTheDocument();
    expect(listPendingInvitationsForUser).toHaveBeenCalledTimes(2);
  });
});
