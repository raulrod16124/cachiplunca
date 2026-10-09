import { Workspace } from '../../../../domain/workspace';
import { WorkspaceId } from '../../../../domain/shared';

describe('Workspace', () => {
  it('creates a workspace with valid data', () => {
    const id = WorkspaceId.create('ws-123');
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T00:00:00.000Z');

    const workspace = Workspace.create({
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
      id: WorkspaceId.create('ws-123'),
      name: '  My Workspace  ',
    });

    expect(workspace.name).toBe('My Workspace');
  });

  it('throws when name is empty', () => {
    expect(() =>
      Workspace.create({
        id: WorkspaceId.create('ws-123'),
        name: '',
      }),
    ).toThrow('Workspace name cannot be empty');
  });

  it('throws when name is only whitespace', () => {
    expect(() =>
      Workspace.create({
        id: WorkspaceId.create('ws-123'),
        name: '   ',
      }),
    ).toThrow('Workspace name cannot be empty');
  });

  it('throws when name exceeds 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() =>
      Workspace.create({
        id: WorkspaceId.create('ws-123'),
        name: longName,
      }),
    ).toThrow('Workspace name cannot exceed 100 characters');
  });

  it('accepts name with exactly 100 characters', () => {
    const name = 'a'.repeat(100);
    const workspace = Workspace.create({
      id: WorkspaceId.create('ws-123'),
      name,
    });

    expect(workspace.name).toBe(name);
  });

  it('sets timestamps to defaults when not provided', () => {
    const before = new Date();
    const workspace = Workspace.create({
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });
    const after = new Date();

    expect(workspace.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(workspace.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(workspace.updatedAt.getTime()).toBe(workspace.createdAt.getTime());
  });

  it('throws when updatedAt is before createdAt', () => {
    expect(() =>
      Workspace.create({
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
        id: WorkspaceId.create('ws-123'),
        name: 'Test',
        createdAt: invalidDate as unknown as Date,
        updatedAt: new Date(),
      }),
    ).toThrow('Timestamps must be valid Date instances');
  });

  it('updates workspace name', () => {
    const workspace = Workspace.create({
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
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      description: 'Old desc',
    });

    const updated = workspace.update({ description: 'New desc' });

    expect(updated.description).toBe('New desc');
  });

  it('clears description when set to null', () => {
    const workspace = Workspace.create({
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
      description: 'Old desc',
    });

    const updated = workspace.update({ description: null });

    expect(updated.description).toBeNull();
  });

  it('preserves existing values when no updates provided', () => {
    const workspace = Workspace.create({
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
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });
    const customUpdatedAt = new Date(workspace.createdAt.getTime() + 1000);

    const updated = workspace.update({ updatedAt: customUpdatedAt });

    expect(updated.updatedAt).toBe(customUpdatedAt);
  });

  it('throws on invalid update name', () => {
    const workspace = Workspace.create({
      id: WorkspaceId.create('ws-123'),
      name: 'Test',
    });

    expect(() => workspace.update({ name: '' })).toThrow('Workspace name cannot be empty');
  });

  it('serializes to JSON correctly', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T01:00:00.000Z');
    const workspace = Workspace.create({
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
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z',
      description: 'Description',
    });
  });
});
