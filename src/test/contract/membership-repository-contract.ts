import type { MembershipRepository } from '../../application/ports';
import { Membership, type MembershipRole } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { ERROR_CODES, isAppError } from '../../shared/errors';

type RepositoryFactory = () => MembershipRepository | Promise<MembershipRepository>;

const USER = UserId.create('user-1');
const OTHER_USER = UserId.create('user-2');
const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');

function requireMembership(membership: Membership | null): Membership {
  if (membership === null) {
    throw new Error('Expected the repository to return a membership, got null');
  }
  return membership;
}

function expectSameMembership(actual: Membership, expected: Membership): void {
  expect(actual).toBeInstanceOf(Membership);
  expect(actual.userId.equals(expected.userId)).toBe(true);
  expect(actual.workspaceId.equals(expected.workspaceId)).toBe(true);
  expect(actual.role).toBe(expected.role);
  expect(actual.createdAt.getTime()).toBe(expected.createdAt.getTime());
  expect(actual.updatedAt.getTime()).toBe(expected.updatedAt.getTime());
}

export function describeMembershipRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: MembershipRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts with empty listings', async () => {
      await expect(repository.listByWorkspace(WORKSPACE)).resolves.toEqual([]);
      await expect(repository.listByUser(USER)).resolves.toEqual([]);
    });

    it('creates a membership as a domain entity with timestamps', async () => {
      const membership = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'owner',
      });

      expect(membership).toBeInstanceOf(Membership);
      expect(membership.userId.equals(USER)).toBe(true);
      expect(membership.workspaceId.equals(WORKSPACE)).toBe(true);
      expect(membership.role).toBe('owner');
      expect(membership.createdAt).toBeInstanceOf(Date);
      expect(membership.updatedAt.getTime()).toBeGreaterThanOrEqual(membership.createdAt.getTime());
    });

    it('exposes created memberships through findByUserAndWorkspace', async () => {
      const created = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'editor',
      });

      const found = await repository.findByUserAndWorkspace(USER, WORKSPACE);
      expectSameMembership(requireMembership(found), created);
    });

    it('returns null from findByUserAndWorkspace for an unknown membership', async () => {
      expect(await repository.findByUserAndWorkspace(USER, WORKSPACE)).toBeNull();
    });

    it('lists memberships by workspace', async () => {
      const owner = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'owner',
      });
      const editor = await repository.create({
        userId: OTHER_USER,
        workspaceId: WORKSPACE,
        role: 'editor',
      });
      await repository.create({ userId: USER, workspaceId: OTHER_WORKSPACE, role: 'viewer' });

      const listed = await repository.listByWorkspace(WORKSPACE);
      expect(listed).toHaveLength(2);
      expect(listed).toEqual(expect.arrayContaining([owner, editor]));
    });

    it('lists memberships by user', async () => {
      const first = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'owner',
      });
      const second = await repository.create({
        userId: USER,
        workspaceId: OTHER_WORKSPACE,
        role: 'editor',
      });
      await repository.create({ userId: OTHER_USER, workspaceId: WORKSPACE, role: 'viewer' });

      const listed = await repository.listByUser(USER);
      expect(listed).toHaveLength(2);
      expect(listed).toEqual(expect.arrayContaining([first, second]));
    });

    it('updates the role with a new instance while preserving identity and createdAt', async () => {
      const created = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'viewer',
      });

      const updated = await repository.updateRole(USER, WORKSPACE, 'editor');

      expect(updated).not.toBe(created);
      expect(updated.userId.equals(created.userId)).toBe(true);
      expect(updated.workspaceId.equals(created.workspaceId)).toBe(true);
      expect(updated.role).toBe('editor');
      expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

      const found = await repository.findByUserAndWorkspace(USER, WORKSPACE);
      expectSameMembership(requireMembership(found), updated);
    });

    it('deletes a membership and stops exposing it', async () => {
      await repository.create({ userId: USER, workspaceId: WORKSPACE, role: 'editor' });

      await expect(repository.delete(USER, WORKSPACE)).resolves.toBeUndefined();

      expect(await repository.findByUserAndWorkspace(USER, WORKSPACE)).toBeNull();
      await expect(repository.listByWorkspace(WORKSPACE)).resolves.toEqual([]);
    });

    it('rejects a duplicate create with a conflict AppError', async () => {
      await repository.create({ userId: USER, workspaceId: WORKSPACE, role: 'owner' });

      await expect(
        repository.create({ userId: USER, workspaceId: WORKSPACE, role: 'viewer' }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS,
      });

      const listed = await repository.listByWorkspace(WORKSPACE);
      expect(listed).toHaveLength(1);
      expect(listed[0].role).toBe('owner');
    });

    it('rejects updateRole with a notFound AppError for an unknown membership', async () => {
      await expect(repository.updateRole(USER, WORKSPACE, 'editor')).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects delete with a notFound AppError for an unknown membership', async () => {
      await expect(repository.delete(USER, WORKSPACE)).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects create with a validation AppError when the role is invalid', async () => {
      await expect(
        repository.create({
          userId: USER,
          workspaceId: WORKSPACE,
          role: 'admin' as MembershipRole,
        }),
      ).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });

      await expect(repository.listByWorkspace(WORKSPACE)).resolves.toEqual([]);
    });

    it('rejects updateRole with a validation AppError and keeps the stored role intact', async () => {
      const created = await repository.create({
        userId: USER,
        workspaceId: WORKSPACE,
        role: 'editor',
      });

      await expect(
        repository.updateRole(USER, WORKSPACE, 'admin' as MembershipRole),
      ).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });

      const stored = await repository.findByUserAndWorkspace(USER, WORKSPACE);
      expectSameMembership(requireMembership(stored), created);
    });

    it('rejects every failing operation with an AppError instead of a raw error', async () => {
      await repository.create({ userId: USER, workspaceId: WORKSPACE, role: 'owner' });

      const operations = [
        repository.create({ userId: USER, workspaceId: WORKSPACE, role: 'owner' }),
        repository.create({
          userId: OTHER_USER,
          workspaceId: WORKSPACE,
          role: 'admin' as MembershipRole,
        }),
        repository.updateRole(OTHER_USER, WORKSPACE, 'editor'),
        repository.delete(OTHER_USER, WORKSPACE),
      ];

      for (const operation of operations) {
        const error: unknown = await operation.catch((reason: unknown) => reason);
        expect(isAppError(error)).toBe(true);
      }
    });
  });
}
