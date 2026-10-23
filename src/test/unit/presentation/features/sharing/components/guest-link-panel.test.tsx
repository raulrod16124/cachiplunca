import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createCreateGuestLink,
  createRevokeGuestLink,
} from '../../../../../../application/commands';
import { createListActiveGuestLinks } from '../../../../../../application/queries';
import { GuestLinkPanel } from '../../../../../../presentation/features/sharing/components/guest-link-panel';
import { buildGuestViewLink } from '../../../../../../presentation/features/guest/guest-link';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { FakeGuestLinkRepository } from '../../../../../fixtures/fake-guest-link-repository';
import { FakeMembershipRepository } from '../../../../../fixtures/fake-membership-repository';

const WORKSPACE_ID = 'ws-1';
const OWNER_ID = 'owner-1';
const TOKEN_HASH = 'a'.repeat(64);

const writeText = jest.fn<Promise<void>, [string]>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

async function makeServices() {
  const guestLinks = new FakeGuestLinkRepository();
  const memberships = new FakeMembershipRepository();
  const ownerId = UserId.create(OWNER_ID);
  await memberships.create({
    userId: ownerId,
    workspaceId: WorkspaceId.create(WORKSPACE_ID),
    role: 'owner',
  });

  return {
    listActiveGuestLinks: createListActiveGuestLinks({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
    }),
    createGuestLink: createCreateGuestLink({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
      issueToken: async () => ({ token: 'token-1', tokenHash: TOKEN_HASH }),
    }),
    revokeGuestLink: createRevokeGuestLink({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
    }),
    openGuestWorkspace: async () => ({ status: 'invalid' as const }),
  };
}

describe('GuestLinkPanel', () => {
  it('creates and revokes a read-only link', async () => {
    const services = await makeServices();
    render(
      <GuestLinkPanel
        active
        workspaceId={WORKSPACE_ID}
        currentUserId={OWNER_ID}
        services={services}
      />,
    );

    expect(await screen.findByText('There is no active read-only link.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create view link' }));

    const input = await screen.findByLabelText('Read-only link');
    expect(input).toHaveValue(buildGuestViewLink('token-1'));
    expect(screen.getByText(/A read-only link is active/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(buildGuestViewLink('token-1'));
    expect(await screen.findByText('Link copied to clipboard.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke view link' }));

    await waitFor(() =>
      expect(screen.getByText('There is no active read-only link.')).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Read-only link')).not.toBeInTheDocument();
  });

  it('builds a link under the public base path', () => {
    expect(buildGuestViewLink('token-1', 'https://example.test')).toBe(
      'https://example.test/view/token-1',
    );
  });
});
