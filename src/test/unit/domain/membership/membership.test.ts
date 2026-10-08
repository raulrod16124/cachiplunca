import { Membership } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import type { MembershipRole } from '../../../../domain/membership';

describe('Membership', () => {
  it('creates a membership with valid data', () => {
    const userId = UserId.create('user-123');
    const workspaceId = WorkspaceId.create('ws-123');
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T00:00:00.000Z');

    const membership = Membership.create({
      userId,
      workspaceId,
      role: 'owner',
      createdAt,
      updatedAt,
    });

    expect(membership.userId).toBe(userId);
    expect(membership.workspaceId).toBe(workspaceId);
    expect(membership.role).toBe('owner');
    expect(membership.createdAt).toBe(createdAt);
    expect(membership.updatedAt).toBe(updatedAt);
  });

  it('sets timestamps to defaults when not provided', () => {
    const before = new Date();
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'editor',
    });
    const after = new Date();

    expect(membership.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(membership.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(membership.updatedAt.getTime()).toBe(membership.createdAt.getTime());
  });

  it('throws when role is invalid', () => {
    expect(() =>
      Membership.create({
        userId: UserId.create('user-123'),
        workspaceId: WorkspaceId.create('ws-123'),
        role: 'admin' as MembershipRole,
      }),
    ).toThrow('Invalid membership role');
  });

  it('throws when updatedAt is before createdAt', () => {
    expect(() =>
      Membership.create({
        userId: UserId.create('user-123'),
        workspaceId: WorkspaceId.create('ws-123'),
        role: 'owner',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow('Updated at cannot be before created at');
  });

  it('throws when timestamps are invalid', () => {
    const invalidDate = new Date('invalid');
    expect(() =>
      Membership.create({
        userId: UserId.create('user-123'),
        workspaceId: WorkspaceId.create('ws-123'),
        role: 'viewer',
        createdAt: invalidDate as unknown as Date,
        updatedAt: new Date(),
      }),
    ).toThrow('Timestamps must be valid Date instances');
  });

  it('updates role', () => {
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'viewer',
    });

    const updated = membership.updateRole('editor');

    expect(updated.role).toBe('editor');
    expect(updated.userId).toBe(membership.userId);
    expect(updated.workspaceId).toBe(membership.workspaceId);
    expect(updated.createdAt).toBe(membership.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(membership.updatedAt.getTime());
  });

  it('updates role with custom updatedAt', () => {
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'viewer',
    });
    const customUpdatedAt = new Date(membership.createdAt.getTime() + 1000);

    const updated = membership.updateRole('owner', customUpdatedAt);

    expect(updated.role).toBe('owner');
    expect(updated.updatedAt).toBe(customUpdatedAt);
  });

  it('throws on invalid role update', () => {
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'viewer',
    });

    expect(() => membership.updateRole('admin' as MembershipRole)).toThrow(
      'Invalid membership role',
    );
  });

  it('validates timestamps on role update', () => {
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'viewer',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(() => membership.updateRole('editor', new Date('2023-12-31T00:00:00.000Z'))).toThrow(
      'Updated at cannot be before created at',
    );
  });

  it('checks permission helpers correctly', () => {
    const owner = Membership.create({
      userId: UserId.create('user-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'owner',
    });
    const editor = Membership.create({
      userId: UserId.create('user-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'editor',
    });
    const viewer = Membership.create({
      userId: UserId.create('user-3'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'viewer',
    });

    expect(owner.isOwner()).toBe(true);
    expect(owner.isEditor()).toBe(false);
    expect(owner.isViewer()).toBe(false);
    expect(owner.canEdit()).toBe(true);
    expect(owner.canView()).toBe(true);

    expect(editor.isOwner()).toBe(false);
    expect(editor.isEditor()).toBe(true);
    expect(editor.isViewer()).toBe(false);
    expect(editor.canEdit()).toBe(true);
    expect(editor.canView()).toBe(true);

    expect(viewer.isOwner()).toBe(false);
    expect(viewer.isEditor()).toBe(false);
    expect(viewer.isViewer()).toBe(true);
    expect(viewer.canEdit()).toBe(false);
    expect(viewer.canView()).toBe(true);
  });

  it('serializes to JSON correctly', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T01:00:00.000Z');
    const membership = Membership.create({
      userId: UserId.create('user-123'),
      workspaceId: WorkspaceId.create('ws-123'),
      role: 'editor',
      createdAt,
      updatedAt,
    });

    const json = membership.toJSON();

    expect(json).toEqual({
      userId: 'user-123',
      workspaceId: 'ws-123',
      role: 'editor',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z',
    });
  });
});
