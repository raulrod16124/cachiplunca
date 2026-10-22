import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import {
  createChangeMemberRole,
  createDeleteWorkspace,
  createLeaveWorkspace,
  createRemoveMember,
} from '../../application/commands';
import type { MembershipRole } from '../../domain/membership';
import { UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { ERROR_CODES } from '../../shared/errors';
import { createAppHarness, type AppHarness } from './harness';

function boardItems(): HTMLElement[] {
  return screen.queryAllByTestId(/^canvas-item-/);
}

async function openBoardAs(
  role: MembershipRole,
  name: string,
): Promise<{ harness: AppHarness; workspace: Workspace; view: RenderResult }> {
  const harness = createAppHarness();
  await harness.register();
  const workspace = await harness.createOwnerWorkspace(name);
  const actorId = UserId.create(`actor-${role}-${Date.now()}`);
  await harness.membershipRepository.create({
    userId: actorId,
    workspaceId: workspace.id,
    role,
  });

  harness.authPort.setSession({
    uid: actorId.value,
    email: `${role}@example.com`,
    emailVerified: false,
    displayName: null,
  });

  const view = harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
  expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();

  return { harness, workspace, view };
}

async function openBoardWithNonMember(): Promise<{ harness: AppHarness; workspace: Workspace }> {
  const harness = createAppHarness();
  await harness.register();
  const workspace = await harness.createOwnerWorkspace('Non-member board');

  harness.authPort.setSession({
    uid: 'stranger',
    email: 'stranger@example.com',
    emailVerified: false,
    displayName: null,
  });

  harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
  expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();

  return { harness, workspace };
}

describe('permissions', () => {
  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('renders canvas as read-only for viewers and blocks write actions', async () => {
    const { harness, workspace } = await openBoardAs('viewer', 'Viewer board');

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('aria-readonly', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    await waitFor(() => expect(boardItems()).toHaveLength(0));

    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add frame' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Connect selected elements' })).toBeDisabled();

    await expect(harness.elementRepository.listByWorkspace(workspace.id)).resolves.toEqual([]);
  });

  it('does not show the invite tab to viewers in the share dialog', async () => {
    await openBoardAs('viewer', 'Viewer share');

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Invite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave board' })).toBeInTheDocument();
  });

  it('enables write actions for editors and keeps invite available', async () => {
    const { harness, workspace } = await openBoardAs('editor', 'Editor board');

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('aria-readonly', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    await waitFor(async () =>
      expect(await harness.elementRepository.listByWorkspace(workspace.id)).toHaveLength(1),
    );

    expect(screen.getByRole('button', { name: 'Add note' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add task' })).not.toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows invite tab for editors when invitation services are wired', async () => {
    await openBoardAs('editor', 'Editor invite');

    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(await screen.findByRole('tab', { name: 'Invite' })).toBeInTheDocument();
  });

  it('treats unknown membership as read-only without share entry point', async () => {
    await openBoardWithNonMember();

    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('aria-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('forbids viewers from deleting workspaces', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Viewer delete');
    const actor = UserId.create('viewer-actor');
    await harness.membershipRepository.create({
      userId: actor,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    const deleteWorkspace = createDeleteWorkspace({
      workspaceRepository: harness.workspaceRepository,
      membershipRepository: harness.membershipRepository,
    });

    const result = await deleteWorkspace({ id: workspace.id.value, actorUserId: actor.value });

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: ERROR_CODES.AUTH_FORBIDDEN },
    });
    await expect(harness.workspaceRepository.findById(workspace.id)).resolves.not.toBeNull();
  });

  it('forbids editors from changing member roles', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Editor role');
    const actor = UserId.create('editor-actor');
    const target = UserId.create('target-user');
    await harness.membershipRepository.create({
      userId: actor,
      workspaceId: workspace.id,
      role: 'editor',
    });
    await harness.membershipRepository.create({
      userId: target,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    const changeMemberRole = createChangeMemberRole(harness.membershipRepository);

    const result = await changeMemberRole({
      workspaceId: workspace.id,
      actorUserId: actor,
      targetUserId: target,
      role: 'editor',
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: ERROR_CODES.AUTH_FORBIDDEN },
    });
  });

  it('forbids editors from removing members', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Editor remove');
    const actor = UserId.create('editor-actor');
    const target = UserId.create('target-user');
    await harness.membershipRepository.create({
      userId: actor,
      workspaceId: workspace.id,
      role: 'editor',
    });
    await harness.membershipRepository.create({
      userId: target,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    const removeMember = createRemoveMember(harness.membershipRepository);

    const result = await removeMember({
      workspaceId: workspace.id,
      actorUserId: actor,
      targetUserId: target,
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: ERROR_CODES.AUTH_FORBIDDEN },
    });
  });

  it('allows viewers and editors to leave a workspace', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Leave board');
    const actor = UserId.create('viewer-leave');
    await harness.membershipRepository.create({
      userId: actor,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    const leaveWorkspace = createLeaveWorkspace(harness.membershipRepository);

    const result = await leaveWorkspace({
      workspaceId: workspace.id,
      userId: actor,
    });

    expect(result).toMatchObject({ status: 'ok' });
    await expect(
      harness.membershipRepository.findByUserAndWorkspace(actor, workspace.id),
    ).resolves.toBeNull();
  });

  it('allows owners full access including changing roles', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Owner access');
    const target = UserId.create('target-user');
    await harness.membershipRepository.create({
      userId: target,
      workspaceId: workspace.id,
      role: 'viewer',
    });

    const changeMemberRole = createChangeMemberRole(harness.membershipRepository);

    const result = await changeMemberRole({
      workspaceId: workspace.id,
      actorUserId: UserId.create(harness.currentUser?.uid ?? ''),
      targetUserId: target,
      role: 'editor',
    });

    expect(result.status).toBe('ok');
  });
});
