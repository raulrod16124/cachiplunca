import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { createDeleteWorkspace } from '../../application/commands';
import { createTextElement } from '../../domain/element';
import type { MembershipRole } from '../../domain/membership';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import { ERROR_CODES } from '../../shared/errors';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function boardItems(): HTMLElement[] {
  return screen.queryAllByTestId(/^canvas-item-/);
}

function fillCredentials(): void {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: DEFAULT_CREDENTIALS.email },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: DEFAULT_CREDENTIALS.password },
  });
}

describe('critical journey', () => {
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

  it('takes a new owner from registration to a persisted, editable board', async () => {
    const harness = createAppHarness();
    harness.render({ initialPath: '/register' });

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();

    const [createTrigger] = screen.getAllByRole('button', { name: 'Create board' });
    fireEvent.click(createTrigger);
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Roadmap Q4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();

    const [workspace] = await harness.workspaceRepository.list();
    const owner = harness.currentUser;
    expect(owner).not.toBeNull();
    expect(
      await harness.membershipRepository.findByUserAndWorkspace(
        UserId.create(owner?.uid ?? ''),
        workspace.id,
      ),
    ).toMatchObject({ role: 'owner' });

    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(boardItems()).toHaveLength(2));

    await waitFor(async () =>
      expect(await harness.elementRepository.listByWorkspace(workspace.id)).toHaveLength(2),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(boardItems()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: 'Delete selection' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    await waitFor(async () =>
      expect(await harness.elementRepository.listByWorkspace(workspace.id)).toHaveLength(1),
    );
  });

  it('restores persisted elements after the board reloads', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Recovery board');
    const boardPath = `/workspaces/${workspace.id.value}`;

    const view = harness.render({ initialPath: boardPath });
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Persist me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));
    await waitFor(async () =>
      expect(await harness.elementRepository.listByWorkspace(workspace.id)).toHaveLength(1),
    );

    view.unmount();

    harness.render({ initialPath: boardPath });
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    await waitFor(() => expect(boardItems()).toHaveLength(1));
    expect(screen.getByTestId('canvas-item-el-1')).toBeInTheDocument();
  });

  it('applies remote changes without discarding them on local undo', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Live board');

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    await waitFor(() => expect(boardItems()).toHaveLength(1));

    const remote = createTextElement({
      id: ElementId.create('remote-1'),
      workspaceId: workspace.id,
      createdBy: UserId.create('teammate-1'),
      position: Position.create(40, 40),
      size: Size.create(160, 40),
      content: 'from a teammate',
    });

    await act(async () => {
      harness.realtimePort.emit({
        workspaceId: workspace.id,
        changes: [{ kind: 'added', element: remote, origin: 'remote' }],
      });
    });
    await waitFor(() => expect(boardItems()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(boardItems()).toHaveLength(3));

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(boardItems()).toHaveLength(2));
    expect(screen.getByTestId('canvas-item-remote-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-item-el-1')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-item-el-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(boardItems()).toHaveLength(3));
  });

  it('lets the owner delete the workspace', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Delete me');

    const deleteWorkspace = createDeleteWorkspace({
      workspaceRepository: harness.workspaceRepository,
      membershipRepository: harness.membershipRepository,
    });

    await expect(
      deleteWorkspace({ id: workspace.id.value, actorUserId: owner.uid }),
    ).resolves.toEqual({ status: 'ok' });
    await expect(harness.workspaceRepository.findById(workspace.id)).resolves.toBeNull();
  });

  it('forbids editors, viewers and non-members from deleting the workspace', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Protected');

    const deleteWorkspace = createDeleteWorkspace({
      workspaceRepository: harness.workspaceRepository,
      membershipRepository: harness.membershipRepository,
    });

    const forbiddenRoles: readonly MembershipRole[] = ['editor', 'viewer'];
    for (const [index, role] of forbiddenRoles.entries()) {
      const actor = UserId.create(`actor-${index}`);
      await harness.membershipRepository.create({
        userId: actor,
        workspaceId: workspace.id,
        role,
      });

      const result = await deleteWorkspace({ id: workspace.id.value, actorUserId: actor.value });
      expect(result).toMatchObject({
        status: 'error',
        error: { kind: 'authorization', code: ERROR_CODES.AUTH_FORBIDDEN },
      });
    }

    const outsider = await deleteWorkspace({
      id: workspace.id.value,
      actorUserId: 'stranger',
    });
    expect(outsider).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: ERROR_CODES.AUTH_FORBIDDEN },
    });

    await expect(harness.workspaceRepository.findById(workspace.id)).resolves.not.toBeNull();
  });
});
