import {
  createDeleteWorkspace,
  validateDeleteWorkspaceInput,
  type DeleteWorkspaceResult,
} from '../../../../application/commands';
import type { MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const OWNER = UserId.create('user-owner');
const OTHER_USER = UserId.create('user-other');
const CREATED_BY = UserId.create('user-1');

async function seedMember(
  repository: FakeMembershipRepository,
  userId: UserId,
  role: MembershipRole,
  workspace: WorkspaceId,
): Promise<void> {
  await repository.create({ userId, workspaceId: workspace, role });
}

function createFixture() {
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const deleteWorkspace = createDeleteWorkspace({ workspaceRepository, membershipRepository });
  return { workspaceRepository, membershipRepository, deleteWorkspace };
}

describe('validateDeleteWorkspaceInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateDeleteWorkspaceInput({ id: 'ws-1', actorUserId: 'user-1' })).toEqual({});
  });

  it('rejects an empty id', () => {
    expect(validateDeleteWorkspaceInput({ id: '', actorUserId: 'user-1' }).id).toBe(
      'Enter a workspace id.',
    );
  });

  it('rejects a whitespace-only id', () => {
    expect(validateDeleteWorkspaceInput({ id: '   ', actorUserId: 'user-1' }).id).toBe(
      'Enter a workspace id.',
    );
  });

  it('rejects an empty actor user id', () => {
    expect(validateDeleteWorkspaceInput({ id: 'ws-1', actorUserId: '' }).actorUserId).toBe(
      'Enter a user id.',
    );
  });
});

describe('createDeleteWorkspace', () => {
  it('lets an owner delete a workspace so it is no longer exposed', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const created = await workspaceRepository.create({ createdBy: CREATED_BY, name: 'Disposable' });
    await seedMember(membershipRepository, OWNER, 'owner', created.id);

    const result = await deleteWorkspace({ id: created.id.value, actorUserId: OWNER.value });

    expect(result.status).toBe('ok');
    expect(await workspaceRepository.list()).toEqual([]);
    expect(await workspaceRepository.findById(created.id)).toBeNull();
  });

  it('accepts an id with surrounding whitespace', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const created = await workspaceRepository.create({ createdBy: CREATED_BY, name: 'Disposable' });
    await seedMember(membershipRepository, OWNER, 'owner', created.id);

    const result = await deleteWorkspace({
      id: `  ${created.id.value}  `,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('ok');
    expect(await workspaceRepository.list()).toEqual([]);
  });

  it.each<MembershipRole>(['editor', 'viewer'])(
    'forbids a %s from deleting the workspace without touching the repository',
    async (actorRole) => {
      const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
      const created = await workspaceRepository.create({
        createdBy: CREATED_BY,
        name: 'Protected',
      });
      await seedMember(membershipRepository, OTHER_USER, actorRole, created.id);
      const remove = jest.spyOn(workspaceRepository, 'delete');

      const result = await deleteWorkspace({
        id: created.id.value,
        actorUserId: OTHER_USER.value,
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('authorization');
        expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
      }
      expect(remove).not.toHaveBeenCalled();
      expect(await workspaceRepository.findById(created.id)).not.toBeNull();
    },
  );

  it('forbids an actor that is not a member of the workspace', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const created = await workspaceRepository.create({ createdBy: CREATED_BY, name: 'Protected' });
    const otherWorkspace = await workspaceRepository.create({
      createdBy: CREATED_BY,
      name: 'Other',
    });
    await seedMember(membershipRepository, OWNER, 'owner', otherWorkspace.id);

    const result = await deleteWorkspace({ id: created.id.value, actorUserId: OWNER.value });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
    expect(await workspaceRepository.findById(created.id)).not.toBeNull();
  });

  it('forbids deleting an unknown workspace without touching the repository', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    await seedMember(membershipRepository, OWNER, 'owner', WorkspaceId.create('ws-1'));
    const remove = jest.spyOn(workspaceRepository, 'delete');

    const result = await deleteWorkspace({ id: 'missing', actorUserId: OWNER.value });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not call the repositories when input is invalid', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const removeWorkspace = jest.spyOn(workspaceRepository, 'delete');
    const findMembership = jest.spyOn(membershipRepository, 'findByUserAndWorkspace');

    const emptyId = await deleteWorkspace({ id: '', actorUserId: OWNER.value });
    expect(emptyId.status).toBe('invalid-input');
    if (emptyId.status === 'invalid-input') {
      expect(emptyId.fieldErrors.id).toBe('Enter a workspace id.');
    }

    const emptyActor = await deleteWorkspace({ id: 'ws-1', actorUserId: '' });
    expect(emptyActor.status).toBe('invalid-input');
    if (emptyActor.status === 'invalid-input') {
      expect(emptyActor.fieldErrors.actorUserId).toBe('Enter a user id.');
    }

    expect(removeWorkspace).not.toHaveBeenCalled();
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const created = await workspaceRepository.create({ createdBy: CREATED_BY, name: 'Disposable' });
    await seedMember(membershipRepository, OWNER, 'owner', created.id);
    jest.spyOn(workspaceRepository, 'delete').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });

    const result = await deleteWorkspace({ id: created.id.value, actorUserId: OWNER.value });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const { workspaceRepository, membershipRepository, deleteWorkspace } = createFixture();
    const created = await workspaceRepository.create({ createdBy: CREATED_BY, name: 'Disposable' });
    await seedMember(membershipRepository, OWNER, 'owner', created.id);
    jest.spyOn(workspaceRepository, 'delete').mockRejectedValue(new Error('socket hang up'));

    const result: DeleteWorkspaceResult = await deleteWorkspace({
      id: created.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
