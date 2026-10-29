import {
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  type CreateWorkspaceWithOwnerResult,
} from '../../../../application/commands';
import { UserId, ElementId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const OWNER = UserId.create('user-1');

function setup() {
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const elementRepository = new FakeElementRepository();
  let sequence = 0;
  const generateId = () => ElementId.create(`el-${++sequence}`);
  const createWorkspaceWithOwner = createCreateWorkspaceWithOwner({
    workspaceRepository,
    membershipRepository,
    elementRepository,
    createOwnerMembership: createCreateOwnerMembership(membershipRepository),
    generateId,
  });
  return {
    workspaceRepository,
    membershipRepository,
    elementRepository,
    createWorkspaceWithOwner,
  };
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

  it('propagates the workspace type to the repository and keeps it as general by default', async () => {
    const { workspaceRepository, createWorkspaceWithOwner } = setup();

    const typed = await createWorkspaceWithOwner({
      name: 'Trip',
      ownerId: OWNER,
      type: 'travel',
    });
    expect(typed.status).toBe('ok');

    const untyped = await createWorkspaceWithOwner({ name: 'Board', ownerId: OWNER });
    if (untyped.status !== 'ok') {
      throw new Error('expected the workspace to be created');
    }

    const stored = await workspaceRepository.list();
    expect(stored.find((workspace) => workspace.name === 'Trip')?.type).toBe('travel');
    expect(untyped.workspace.type).toBe('general');
  });

  it('does not touch any repository when the name is invalid', async () => {
    const { workspaceRepository, membershipRepository, createWorkspaceWithOwner } = setup();
    const createWorkspace = jest.spyOn(workspaceRepository, 'create');
    const createMembership = jest.spyOn(membershipRepository, 'create');

    const result = await createWorkspaceWithOwner({ name: '   ', ownerId: OWNER });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.name).toBe('Enter a board name.');
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

  it('keeps the board empty when no template is selected', async () => {
    const { elementRepository, createWorkspaceWithOwner } = setup();

    const result = await createWorkspaceWithOwner({ name: 'Blank board', ownerId: OWNER });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    await expect(elementRepository.listByWorkspace(result.workspace.id)).resolves.toHaveLength(0);
  });

  it('creates the template elements with new ids for the new workspace', async () => {
    const { elementRepository, createWorkspaceWithOwner } = setup();

    const result = await createWorkspaceWithOwner({
      name: 'Sprint retro',
      ownerId: OWNER,
      templateId: 'retrospective',
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const elements = await elementRepository.listByWorkspace(result.workspace.id);
    expect(elements.length).toBeGreaterThan(0);
    expect(new Set(elements.map((element) => element.id.value)).size).toBe(elements.length);
    expect(elements.some((element) => element.type === 'frame')).toBe(true);
    expect(elements.some((element) => element.type === 'note')).toBe(true);
    expect(elements.some((element) => element.type === 'task')).toBe(true);
    for (const element of elements) {
      expect(element.workspaceId.equals(result.workspace.id)).toBe(true);
      expect(element.createdBy.equals(OWNER)).toBe(true);
    }
  });

  it('rolls back the workspace, membership and elements when saving the template fails', async () => {
    const {
      workspaceRepository,
      membershipRepository,
      elementRepository,
      createWorkspaceWithOwner,
    } = setup();
    jest.spyOn(elementRepository, 'saveMany').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'Could not write the elements.',
    });

    const result = await createWorkspaceWithOwner({
      name: 'Sprint retro',
      ownerId: OWNER,
      templateId: 'retrospective',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.PERSISTENCE_WRITE_FAILED);
      expect(result.error.details?.workspaceRollbackFailed).toBeUndefined();
    }
    await expect(workspaceRepository.list()).resolves.toHaveLength(0);
    await expect(membershipRepository.listByUser(OWNER)).resolves.toHaveLength(0);
  });

  it('annotates the error when rolling back the template creation fails', async () => {
    const {
      workspaceRepository,
      membershipRepository,
      elementRepository,
      createWorkspaceWithOwner,
    } = setup();
    jest.spyOn(elementRepository, 'saveMany').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'Could not write the elements.',
    });
    jest
      .spyOn(workspaceRepository, 'delete')
      .mockRejectedValue(new Error('Could not delete the workspace.'));

    const result = await createWorkspaceWithOwner({
      name: 'Sprint retro',
      ownerId: OWNER,
      templateId: 'retrospective',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.details?.workspaceRollbackFailed).toBe(true);
    }
    await expect(membershipRepository.listByUser(OWNER)).resolves.toHaveLength(0);
  });
});
