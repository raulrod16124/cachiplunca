import {
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createDuplicateWorkspace,
  validateDuplicateWorkspaceInput,
  type DuplicateWorkspaceResult,
} from '../../../../application/commands';
import { createLoadWorkspaceElements } from '../../../../application/queries';
import { createConnectorElement, createTextElement } from '../../../../domain/element';
import type { MembershipRole } from '../../../../domain/membership';
import { ElementId, Position, Size, UserId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const OWNER = UserId.create('user-owner');
const EDITOR = UserId.create('user-editor');
const VIEWER = UserId.create('user-viewer');
const OUTSIDER = UserId.create('user-outsider');
const CREATED_BY = UserId.create('user-author');
const NOW = new Date('2025-06-01T12:00:00Z');

function sequentialIds(): () => ElementId {
  let counter = 0;
  return () => {
    counter += 1;
    return ElementId.create(`copy-${counter}`);
  };
}

async function seedMember(
  repository: FakeMembershipRepository,
  userId: UserId,
  role: MembershipRole,
  workspaceId: Parameters<FakeMembershipRepository['create']>[0]['workspaceId'],
): Promise<void> {
  await repository.create({ userId, workspaceId, role });
}

function elementProps(
  id: string,
  workspaceId: Parameters<typeof createTextElement>[0]['workspaceId'],
) {
  return {
    id: ElementId.create(id),
    workspaceId,
    createdBy: CREATED_BY,
    position: Position.create(10, 20),
    size: Size.create(200, 120),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function setup() {
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const elementRepository = new FakeElementRepository();
  const generateId = sequentialIds();
  const createWorkspaceWithOwner = createCreateWorkspaceWithOwner({
    workspaceRepository,
    membershipRepository,
    elementRepository,
    createOwnerMembership: createCreateOwnerMembership(membershipRepository),
    generateId,
  });
  const duplicateWorkspace = createDuplicateWorkspace({
    workspaceRepository,
    membershipRepository,
    elementRepository,
    loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
    createWorkspaceWithOwner,
    generateId,
    now: () => NOW,
  });

  return {
    workspaceRepository,
    membershipRepository,
    elementRepository,
    duplicateWorkspace,
    generateId,
  };
}

async function seedSource() {
  const fixture = setup();
  const source = await fixture.workspaceRepository.create({
    name: 'Roadmap Q4',
    description: 'Shared plan',
    createdBy: OWNER,
    type: 'travel',
  });
  await seedMember(fixture.membershipRepository, OWNER, 'owner', source.id);
  return { ...fixture, source };
}

describe('validateDuplicateWorkspaceInput', () => {
  it('returns no errors for valid input', () => {
    expect(
      validateDuplicateWorkspaceInput({ sourceWorkspaceId: 'ws-1', actorUserId: 'user-1' }),
    ).toEqual({});
  });

  it('rejects empty ids', () => {
    const errors = validateDuplicateWorkspaceInput({ sourceWorkspaceId: ' ', actorUserId: '' });

    expect(errors.sourceWorkspaceId).toBe('Enter a workspace id.');
    expect(errors.actorUserId).toBe('Enter a user id.');
  });
});

describe('createDuplicateWorkspace', () => {
  it('duplicates workspace metadata, owner membership and elements', async () => {
    const {
      source,
      workspaceRepository,
      membershipRepository,
      elementRepository,
      duplicateWorkspace,
    } = await seedSource();

    const text = createTextElement({ ...elementProps('text-1', source.id), content: 'Hello' });
    const target = createTextElement({ ...elementProps('text-2', source.id), content: 'World' });
    const connector = createConnectorElement({
      ...elementProps('connector-1', source.id),
      sourceElementId: text.id,
      targetElementId: target.id,
    });
    await elementRepository.saveMany([text, target, connector]);

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.copiedElementCount).toBe(3);
    expect(result.workspace.id.equals(source.id)).toBe(false);
    expect(result.workspace.name).toBe('Copy of Roadmap Q4');
    expect(result.workspace.description).toBe('Shared plan');
    expect(result.workspace.type).toBe('travel');

    const membership = await membershipRepository.findByUserAndWorkspace(
      OWNER,
      result.workspace.id,
    );
    expect(membership?.role).toBe('owner');

    const copies = await elementRepository.listByWorkspace(result.workspace.id);
    expect(copies).toHaveLength(3);
    expect(copies.every((element) => element.workspaceId.equals(result.workspace.id))).toBe(true);
    expect(copies.every((element) => element.createdBy.equals(OWNER))).toBe(true);
    expect(copies.every((element) => element.id.value.startsWith('copy-'))).toBe(true);

    const copiedTexts = copies.filter((element) => element.type === 'text');
    const copiedConnector = copies.find((element) => element.type === 'connector');
    expect(copiedConnector?.type).toBe('connector');
    if (copiedConnector?.type === 'connector') {
      expect(copiedConnector.sourceElementId?.value).toBe(copiedTexts[0].id.value);
      expect(copiedConnector.targetElementId?.value).toBe(copiedTexts[1].id.value);
    }

    const sourceElements = await elementRepository.listByWorkspace(source.id);
    expect(sourceElements).toHaveLength(3);
    expect(sourceElements.map((element) => element.id.value)).toEqual([
      'text-1',
      'text-2',
      'connector-1',
    ]);
    expect(await workspaceRepository.list()).toHaveLength(2);
  });

  it('does not copy other members or invitations', async () => {
    const { source, membershipRepository, duplicateWorkspace } = await seedSource();
    await seedMember(membershipRepository, EDITOR, 'editor', source.id);
    await seedMember(membershipRepository, VIEWER, 'viewer', source.id);

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const duplicatedMembers = await membershipRepository.listByWorkspace(result.workspace.id);
    expect(duplicatedMembers).toHaveLength(1);
    expect(duplicatedMembers[0].userId.equals(OWNER)).toBe(true);
    expect(duplicatedMembers[0].role).toBe('owner');
  });

  it.each<MembershipRole>(['editor', 'viewer'])(
    'forbids a %s from duplicating the workspace',
    async (role) => {
      const { source, workspaceRepository, membershipRepository, duplicateWorkspace } =
        await seedSource();
      await seedMember(membershipRepository, EDITOR, role, source.id);
      const create = jest.spyOn(workspaceRepository, 'create');

      const result = await duplicateWorkspace({
        sourceWorkspaceId: source.id.value,
        actorUserId: EDITOR.value,
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('authorization');
        expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
      }
      expect(create).not.toHaveBeenCalled();
      expect(await workspaceRepository.list()).toHaveLength(1);
    },
  );

  it('forbids a user that is not a member', async () => {
    const { source, workspaceRepository, duplicateWorkspace } = await seedSource();
    const create = jest.spyOn(workspaceRepository, 'create');

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OUTSIDER.value,
    });

    expect(result.status).toBe('error');
    expect(create).not.toHaveBeenCalled();
    expect(await workspaceRepository.list()).toHaveLength(1);
  });

  it('returns not found when the membership exists but the workspace is gone', async () => {
    const { source, membershipRepository, workspaceRepository, duplicateWorkspace } =
      await seedSource();
    await membershipRepository.delete(OWNER, source.id);

    const orphan = await workspaceRepository.create({
      name: 'Orphan',
      createdBy: OWNER,
    });
    await seedMember(membershipRepository, OWNER, 'owner', orphan.id);
    await workspaceRepository.delete(orphan.id);

    const result = await duplicateWorkspace({
      sourceWorkspaceId: orphan.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
    }
  });

  it('does not touch any repository when input is invalid', async () => {
    const { workspaceRepository, membershipRepository, duplicateWorkspace } = await seedSource();
    const create = jest.spyOn(workspaceRepository, 'create');
    const findMembership = jest.spyOn(membershipRepository, 'findByUserAndWorkspace');

    const result: DuplicateWorkspaceResult = await duplicateWorkspace({
      sourceWorkspaceId: ' ',
      actorUserId: '',
    });

    expect(result.status).toBe('invalid-input');
    expect(create).not.toHaveBeenCalled();
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('rolls back the new workspace when the element copy fails', async () => {
    const {
      source,
      workspaceRepository,
      membershipRepository,
      elementRepository,
      duplicateWorkspace,
    } = await seedSource();
    const dangling = createConnectorElement({
      ...elementProps('connector-1', source.id),
      sourceElementId: ElementId.create('missing'),
      targetPoint: Position.create(100, 10),
    });
    await elementRepository.saveMany([dangling]);

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
    expect(await workspaceRepository.list()).toHaveLength(1);
    const memberships = await membershipRepository.listByUser(OWNER);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].workspaceId.equals(source.id)).toBe(true);
  });

  it('cleans up partially saved elements when persistence fails', async () => {
    const {
      source,
      workspaceRepository,
      membershipRepository,
      elementRepository,
      duplicateWorkspace,
    } = await seedSource();
    const first = createTextElement({ ...elementProps('text-1', source.id), content: 'One' });
    const second = createTextElement({ ...elementProps('text-2', source.id), content: 'Two' });
    await elementRepository.saveMany([first, second]);

    const originalSaveMany = elementRepository.saveMany.bind(elementRepository);
    jest.spyOn(elementRepository, 'saveMany').mockImplementation(async (elements) => {
      await originalSaveMany(elements.slice(0, 1));
      throw {
        kind: 'persistence',
        code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
        message: 'Could not write the elements.',
      };
    });

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.PERSISTENCE_WRITE_FAILED);
      expect(result.error.details?.workspaceRollbackFailed).toBeUndefined();
    }
    expect(await workspaceRepository.list()).toHaveLength(1);
    expect(await membershipRepository.listByUser(OWNER)).toHaveLength(1);
    expect(await elementRepository.listByWorkspace(source.id)).toHaveLength(2);
  });

  it('annotates the error when the rollback itself fails', async () => {
    const { source, workspaceRepository, elementRepository, duplicateWorkspace } =
      await seedSource();
    const dangling = createConnectorElement({
      ...elementProps('connector-1', source.id),
      sourceElementId: ElementId.create('missing'),
      targetPoint: Position.create(100, 10),
    });
    await elementRepository.saveMany([dangling]);
    jest
      .spyOn(workspaceRepository, 'delete')
      .mockRejectedValue(new Error('Could not delete the workspace.'));

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.details?.workspaceRollbackFailed).toBe(true);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const { source, workspaceRepository, duplicateWorkspace } = await seedSource();
    jest.spyOn(workspaceRepository, 'create').mockRejectedValue(new Error('socket hang up'));

    const result = await duplicateWorkspace({
      sourceWorkspaceId: source.id.value,
      actorUserId: OWNER.value,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
