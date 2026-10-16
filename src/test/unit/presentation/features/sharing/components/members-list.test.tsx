import { fireEvent, render, screen } from '@testing-library/react';
import { Membership, type MembershipRole } from '../../../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import {
  MembersList,
  memberLabel,
  type MembersListProps,
} from '../../../../../../presentation/features/sharing/components/members-list';

function buildMember(userId: string, role: MembershipRole): Membership {
  return Membership.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create('ws-1'),
    role,
  });
}

function renderList(overrides: Partial<MembersListProps> = {}) {
  const props: MembersListProps = {
    status: 'ready',
    members: [buildMember('user-a', 'owner'), buildMember('user-b', 'editor')],
    currentUserId: 'user-a',
    errorMessage: null,
    actionError: null,
    pendingUserId: null,
    canChangeRole: false,
    canRemove: false,
    canLeave: false,
    onChangeRole: jest.fn(),
    onRemove: jest.fn(),
    onLeave: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  };

  render(<MembersList {...props} />);
  return props;
}

describe('memberLabel', () => {
  it('truncates long ids to their last eight characters', () => {
    expect(memberLabel('abcdefghijkl')).toBe('efghijkl');
  });

  it('keeps short ids intact', () => {
    expect(memberLabel('user-a')).toBe('user-a');
  });
});

describe('MembersList', () => {
  it('shows a loading state', () => {
    renderList({ status: 'loading', members: [] });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error state with a retry action', () => {
    const props = renderList({
      status: 'error',
      members: [],
      errorMessage: 'We could not load members.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load members.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an explicit empty state', () => {
    renderList({ members: [] });

    expect(screen.getByText('No members yet.')).toBeInTheDocument();
  });

  it('renders each member with their role badge', () => {
    renderList();

    expect(screen.getByText('user-a')).toBeInTheDocument();
    expect(screen.getByText('user-b')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('marks the current user and offers leaving when allowed', () => {
    const props = renderList({ canLeave: true });

    expect(screen.getByText('You')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave workspace' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
  });

  it('lets owners change the role of other members', async () => {
    const props = renderList({ canChangeRole: true });

    fireEvent.click(screen.getByRole('combobox', { name: `Role for ${memberLabel('user-b')}` }));
    fireEvent.click(await screen.findByRole('option', { name: 'Viewer' }));

    expect(props.onChangeRole).toHaveBeenCalledWith('user-b', 'viewer');
  });

  it('does not offer a role control for the current user', () => {
    renderList({ canChangeRole: true });

    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('lets owners remove other members', () => {
    const props = renderList({ canRemove: true });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(props.onRemove).toHaveBeenCalledWith('user-b');
  });

  it('surfaces an action error', () => {
    renderList({ actionError: 'You cannot change that member.' });

    expect(screen.getByRole('alert')).toHaveTextContent('You cannot change that member.');
  });
});
