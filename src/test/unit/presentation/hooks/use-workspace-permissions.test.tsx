import { renderHook } from '@testing-library/react';
import { useWorkspacePermissions } from '../../../../presentation/hooks';

describe('useWorkspacePermissions', () => {
  it('exposes the role it was given', () => {
    const { result } = renderHook(() => useWorkspacePermissions('editor'));

    expect(result.current.role).toBe('editor');
  });

  it('grants every operation to an owner', () => {
    const { result } = renderHook(() => useWorkspacePermissions('owner'));

    expect(result.current.can('element:write')).toBe(true);
    expect(result.current.can('member:invite')).toBe(true);
    expect(result.current.can('member:remove')).toBe(true);
  });

  it('lets an editor write elements and invite members', () => {
    const { result } = renderHook(() => useWorkspacePermissions('editor'));

    expect(result.current.can('element:write')).toBe(true);
    expect(result.current.can('member:invite')).toBe(true);
    expect(result.current.can('member:remove')).toBe(false);
  });

  it('restricts a viewer to read-only operations', () => {
    const { result } = renderHook(() => useWorkspacePermissions('viewer'));

    expect(result.current.can('workspace:view')).toBe(true);
    expect(result.current.can('element:write')).toBe(false);
    expect(result.current.can('member:invite')).toBe(false);
  });

  it('denies every operation when the role is unknown', () => {
    const { result } = renderHook(() => useWorkspacePermissions(undefined));

    expect(result.current.role).toBeUndefined();
    expect(result.current.can('workspace:view')).toBe(false);
    expect(result.current.can('element:write')).toBe(false);
    expect(result.current.can('member:invite')).toBe(false);
  });
});
