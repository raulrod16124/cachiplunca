import { WorkspaceId } from '../../../../domain/shared';

describe('WorkspaceId', () => {
  it('creates a workspace id', () => {
    const id = WorkspaceId.create('ws-123');
    expect(id.value).toBe('ws-123');
  });

  it('trims whitespace', () => {
    const id = WorkspaceId.create('  ws-123  ');
    expect(id.value).toBe('ws-123');
  });

  it('throws when empty', () => {
    expect(() => WorkspaceId.create('')).toThrow('WorkspaceId cannot be empty');
  });

  it('throws when only whitespace', () => {
    expect(() => WorkspaceId.create('   ')).toThrow('WorkspaceId cannot be empty');
  });

  it('compares equality correctly', () => {
    const id1 = WorkspaceId.create('ws-123');
    const id2 = WorkspaceId.create('ws-123');
    const id3 = WorkspaceId.create('ws-456');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  it('converts to string', () => {
    const id = WorkspaceId.create('ws-123');
    expect(id.toString()).toBe('ws-123');
  });

  it('creates with of() factory method', () => {
    const id = WorkspaceId.of('ws-123');
    expect(id.value).toBe('ws-123');
  });
});
