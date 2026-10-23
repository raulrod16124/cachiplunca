import { Workspace } from '../../../../domain/workspace';
import { UserId, WorkspaceId } from '../../../../domain/shared';

const CREATED_BY = UserId.create('user-1');

describe('Workspace', () => {
  it('creates a workspace with valid data', () => {
    const id = WorkspaceId.create('ws-123');
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T00:00:00.000Z');

    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id,
      name: 'My Workspace',
      createdAt,
      updatedAt,
    });

    expect(workspace.id).toBe(id);
    expect(workspace.name).toBe('My Workspace');
    expect(workspace.createdAt).toBe(createdAt);
    expect(workspace.updatedAt).toBe(updatedAt);
    expect(workspace.description).toBeNull();
  });

  it('trims the workspace name', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: '  My Workspace  ',
    });

    expect(workspace.name).toBe('My Workspace');
  });

  it('throws when name is empty', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: '',
      }),
    ).toThrow('Board name cannot be empty');
  });

  it('throws when name is only whitespace', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: '   ',
      }),
    ).toThrow('Board name cannot be empty');
  });

  it('throws when name exceeds 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: longName,
      }),
    ).toThrow('Board name cannot exceed 100 characters');
  });

  it('accepts name with exactly 100 characters', () => {
    const name = 'a'.repeat(100);
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name,
    });

    expect(workspace.name).toBe(name);
  });

  it('sets timestamps to defaults when not provided', () => {
    const before = new Date();
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });
    const after = new Date();

    expect(workspace.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(workspace.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(workspace.updatedAt.getTime()).toBe(workspace.createdAt.getTime());
    expect(workspace.lastActivityAt.getTime()).toBe(workspace.createdAt.getTime());
    expect(workspace.activityAt.getTime()).toBe(workspace.createdAt.getTime());
  });

  it('uses updatedAt as the default last activity for legacy data', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');

    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Legacy',
      createdAt,
      updatedAt,
    });

    expect(workspace.lastActivityAt).toBe(updatedAt);
    expect(workspace.activityAt).toBe(updatedAt);
  });

  it('accepts an explicit last activity timestamp', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const lastActivityAt = new Date('2024-01-03T00:00:00.000Z');

    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Active',
      createdAt,
      lastActivityAt,
    });

    expect(workspace.lastActivityAt).toBe(lastActivityAt);
  });

  it('throws when lastActivityAt is before createdAt', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Test',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        lastActivityAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow('Last activity at cannot be before created at');
  });

  it('touches activity without changing metadata timestamps', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');
    const lastActivityAt = new Date('2024-01-03T00:00:00.000Z');
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      createdAt,
      updatedAt,
    });

    const touched = workspace.touchActivity(lastActivityAt);

    expect(touched).not.toBe(workspace);
    expect(touched.lastActivityAt).toBe(lastActivityAt);
    expect(touched.activityAt).toBe(lastActivityAt);
    expect(touched.updatedAt).toBe(updatedAt);
    expect(touched.createdAt).toBe(createdAt);
    expect(touched.name).toBe(workspace.name);
  });

  it('preserves lastActivityAt when updating metadata', () => {
    const lastActivityAt = new Date('2024-01-03T00:00:00.000Z');
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      lastActivityAt,
    });

    const updated = workspace.update({ name: 'Renamed' });

    expect(updated.lastActivityAt).toBe(lastActivityAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(workspace.updatedAt.getTime());
  });

  it('throws when updatedAt is before createdAt', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Test',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow('Updated at cannot be before created at');
  });

  it('throws when timestamps are invalid', () => {
    const invalidDate = new Date('invalid');
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Test',
        createdAt: invalidDate as unknown as Date,
        updatedAt: new Date(),
      }),
    ).toThrow('Timestamps must be valid Date instances');
  });

  it('updates workspace name', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Old Name',
    });

    const updated = workspace.update({ name: 'New Name' });

    expect(updated.name).toBe('New Name');
    expect(updated.id).toBe(workspace.id);
    expect(updated.createdAt).toBe(workspace.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(workspace.updatedAt.getTime());
  });

  it('updates workspace description', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      description: 'Old desc',
    });

    const updated = workspace.update({ description: 'New desc' });

    expect(updated.description).toBe('New desc');
  });

  it('clears description when set to null', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      description: 'Old desc',
    });

    const updated = workspace.update({ description: null });

    expect(updated.description).toBeNull();
  });

  it('preserves existing values when no updates provided', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      description: 'Desc',
    });

    const updated = workspace.update({});

    expect(updated.name).toBe(workspace.name);
    expect(updated.description).toBe(workspace.description);
  });

  it('allows custom updatedAt in update', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });
    const customUpdatedAt = new Date(workspace.createdAt.getTime() + 1000);

    const updated = workspace.update({ updatedAt: customUpdatedAt });

    expect(updated.updatedAt).toBe(customUpdatedAt);
  });

  it('throws on invalid update name', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });

    expect(() => workspace.update({ name: '' })).toThrow('Board name cannot be empty');
  });

  it('creates a workspace with a cover image', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Covered',
      coverImageUrl: 'https://storage.test/cover.png',
      coverImageStoragePath: 'workspaces/ws-123/images/cover.png',
    });

    expect(workspace.coverImageUrl).toBe('https://storage.test/cover.png');
    expect(workspace.coverImageStoragePath).toBe('workspaces/ws-123/images/cover.png');
  });

  it('rejects a cover image URL without a storage path', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Covered',
        coverImageUrl: 'https://storage.test/cover.png',
      }),
    ).toThrow('Cover image URL and storage path must be provided together');
  });

  it('rejects a non-http cover image URL', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Covered',
        coverImageUrl: 'ftp://storage.test/cover.png',
        coverImageStoragePath: 'workspaces/ws-123/images/cover.png',
      }),
    ).toThrow('Cover image URL must be a valid HTTP or HTTPS URL');
  });

  it('rejects a cover storage path outside the workspace images folder', () => {
    expect(() =>
      Workspace.create({
        createdBy: CREATED_BY,
        id: WorkspaceId.create('ws-123'),
        name: 'Covered',
        coverImageUrl: 'https://storage.test/cover.png',
        coverImageStoragePath: 'workspaces/other/images/cover.png',
      }),
    ).toThrow('Cover image storage path must belong to the workspace images folder');
  });

  it('updates and clears the cover image', () => {
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Covered',
    });

    const withCover = workspace.update({
      coverImageUrl: 'https://storage.test/cover.png',
      coverImageStoragePath: 'workspaces/ws-123/images/cover.png',
    });
    expect(withCover.coverImageUrl).toBe('https://storage.test/cover.png');

    const cleared = withCover.update({
      coverImageUrl: null,
      coverImageStoragePath: null,
    });
    expect(cleared.coverImageUrl).toBeNull();
    expect(cleared.coverImageStoragePath).toBeNull();
  });

  it('serializes to JSON correctly', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T01:00:00.000Z');
    const workspace = Workspace.create({
      createdBy: CREATED_BY,
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      createdAt,
      updatedAt,
      description: 'Description',
    });

    const json = workspace.toJSON();

    expect(json).toEqual({
      id: 'ws-123',
      name: 'Test',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z',
      lastActivityAt: '2024-01-01T01:00:00.000Z',
      description: 'Description',
      coverImageUrl: null,
      coverImageStoragePath: null,
    });
  });
});
