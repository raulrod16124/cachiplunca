import {
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  type CreateWorkspaceWithOwnerResult,
} from '../../../../application/commands';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const OWNER = UserId.create('user-1');

function setup() {
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const createWorkspaceWithOwner = createCreateWorkspaceWithOwner({
    workspaceRepository,
    createOwnerMembership: createCreateOwnerMembership(membershipRepository),
  });
  return { workspaceRepository, membershipRepository, createWorkspaceWithOwner };
}

describe('createCreateWorkspaceWithOwner', () => {
  it('creates the workspace and registers its creator as owner', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();

    const result = await createWorkspaceWithOwner({ name: 'Roadmap Q4', ownerId: OWNER });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const workspace = result.workspace;
    await expect(workspaceRepository.findById(workspace.id)).resolves.toBe(workspace);
    const membership = await membershipRepository.findByUserAndWorkspace(OWNER, workspace.id);
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('owner');
    expect(membership?.isOwner()).toBe(true);
  });

  it('trims the name and passes the description through', async () => {
    const { createWorkspaceWithOwner } = setup();

    const result = await createWorkspaceWithOwner({
      name: '  Roadmap Q4  ',
      description: 'Shared plan',
      ownerId: OWNER,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.name).toBe('Roadmap Q4');
      expect(result.workspace.description).toBe('Shared plan');
    }
  });

  it('does not touch any repository when the name is invalid', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();
    const createWorkspace = jest.spyOn(workspaceRepository, 'create');
    const createMembership = jest.spyOn(membershipRepository, 'create');

    const result = await createWorkspaceWithOwner({ name: '   ', ownerId: OWNER });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.name).toBe('Enter a workspace name.');
    }
    expect(createWorkspace).not.toHaveBeenCalled();
    expect(createMembership).not.toHaveBeenCalled();
  });

  it('returns the error and skips membership creation when the workspace fails', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();
    jest.spyOn(workspaceRepository, 'create').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const createMembership = jest.spyOn(membershipRepository, 'create');

    const result = await createWorkspaceWithOwner({ name: 'Roadmap Q4', ownerId: OWNER });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
    expect(createMembership).not.toHaveBeenCalled();
  });

  it('rolls back the workspace when the owner membership cannot be created', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();
    jest.spyOn(membershipRepository, 'create').mockRejectedValue({
      kind: 'conflict',
      code: ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS,
      message: 'The user is already a member of the workspace.',
    });

    const result = await createWorkspaceWithOwner({ name: 'Roadmap Q4', ownerId: OWNER });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('conflict');
      expect(result.error.code).toBe(ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS);
      expect(result.error.details?.workspaceRollbackFailed).toBeUndefined();
    }
    await expect(workspaceRepository.list()).resolves.toHaveLength(0);
  });

  it('annotates the error when the rollback itself fails', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();
    jest.spyOn(membershipRepository, 'create').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'Could not write the membership.',
    });
    jest
      .spyOn(workspaceRepository, 'delete')
      .mockRejectedValue(new Error('Could not delete the workspace.'));

    const result = await createWorkspaceWithOwner({ name: 'Roadmap Q4', ownerId: OWNER });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.PERSISTENCE_WRITE_FAILED);
      expect(result.error.details?.workspaceRollbackFailed).toBe(true);
    }
    await expect(workspaceRepository.list()).resolves.toHaveLength(1);
  });

  it('normalizes unexpected workspace errors into AppError', async () => {
    const { workspaceRepository, createWorkspaceWithOwner } = setup();
    jest.spyOn(workspaceRepository, 'create').mockRejectedValue(new Error('socket hang up'));

    const result: CreateWorkspaceWithOwnerResult = await createWorkspaceWithOwner({
      name: 'Roadmap Q4',
      ownerId: OWNER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });

  it('issues an owner membership scoped to the created workspace', async () => {
    const { membershipRepository, createWorkspaceWithOwner } = setup();

    const result = await createWorkspaceWithOwner({ name: 'Roadmap Q4', ownerId: OWNER });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const memberships = await membershipRepository.listByUser(OWNER);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].workspaceId.equals(result.workspace.id)).toBe(true);
    expect(memberships[0].workspaceId.equals(WorkspaceId.create('ws-unknown'))).toBe(false);
  });
});
