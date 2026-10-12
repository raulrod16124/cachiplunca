import {
  canonicalizeElement,
  compareElementVersions,
  isStrictlyNewer,
  resolveElementVersion,
} from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildElement(
  id: string,
  overrides: {
    readonly content?: string;
    readonly x?: number;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
  } = {},
): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(overrides.x ?? 10, 20),
    size: Size.create(120, 80),
    content: overrides.content ?? 'Hello',
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00.000Z'),
  });
}

describe('compareElementVersions', () => {
  it('returns 1 when the first version is strictly newer', () => {
    const newer = buildElement('el-1', { updatedAt: new Date('2024-01-03T00:00:00.000Z') });
    const older = buildElement('el-1', { updatedAt: new Date('2024-01-02T00:00:00.000Z') });

    expect(compareElementVersions(newer, older)).toBe(1);
  });

  it('returns -1 when the first version is strictly older', () => {
    const older = buildElement('el-1', { updatedAt: new Date('2024-01-01T00:00:00.000Z') });
    const newer = buildElement('el-1', { updatedAt: new Date('2024-01-02T00:00:00.000Z') });

    expect(compareElementVersions(older, newer)).toBe(-1);
  });

  it('returns 0 when both versions share the same updatedAt', () => {
    const a = buildElement('el-1', { content: 'A' });
    const b = buildElement('el-1', { content: 'B' });

    expect(compareElementVersions(a, b)).toBe(0);
  });
});

describe('isStrictlyNewer', () => {
  it('is true only for a strictly newer version', () => {
    const base = new Date('2024-01-02T00:00:00.000Z');
    const newer = buildElement('el-1', { updatedAt: new Date('2024-01-03T00:00:00.000Z') });
    const same = buildElement('el-1', { updatedAt: base });
    const current = buildElement('el-1', { updatedAt: base });

    expect(isStrictlyNewer(newer, current)).toBe(true);
    expect(isStrictlyNewer(same, current)).toBe(false);
  });

  it('ignores an older version even if its content differs', () => {
    const current = buildElement('el-1', { updatedAt: new Date('2024-01-03T00:00:00.000Z') });
    const older = buildElement('el-1', {
      content: 'changed',
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(isStrictlyNewer(older, current)).toBe(false);
  });
});

describe('resolveElementVersion', () => {
  it('picks the strictly newer version regardless of argument order', () => {
    const newer = buildElement('el-1', {
      content: 'newer',
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    });
    const older = buildElement('el-1', {
      content: 'older',
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(resolveElementVersion(newer, older)).toBe(newer);
    expect(resolveElementVersion(older, newer)).toBe(newer);
  });

  it('resolves a tie deterministically and symmetrically', () => {
    const a = buildElement('el-1', { content: 'alpha' });
    const b = buildElement('el-1', { content: 'bravo' });

    const first = resolveElementVersion(a, b);
    const second = resolveElementVersion(b, a);

    expect(first).toBe(second);
  });

  it('returns the same reference when both versions are identical', () => {
    const element = buildElement('el-1');

    expect(resolveElementVersion(element, element)).toBe(element);
  });

  it('throws when the two versions belong to different elements', () => {
    const a = buildElement('el-1');
    const b = buildElement('el-2');

    expect(() => resolveElementVersion(a, b)).toThrow('same id');
  });
});

describe('canonicalizeElement', () => {
  it('is deterministic regardless of how the element was built', () => {
    const a = buildElement('el-1', { content: 'same' });
    const b = buildElement('el-1', { content: 'same' });

    expect(canonicalizeElement(a)).toBe(canonicalizeElement(b));
  });

  it('reflects content differences on the same timestamp', () => {
    const a = buildElement('el-1', { content: 'alpha' });
    const b = buildElement('el-1', { content: 'bravo' });

    expect(canonicalizeElement(a)).not.toBe(canonicalizeElement(b));
  });

  it('serializes dates and value objects in a stable form', () => {
    const element = buildElement('el-1', {
      content: 'stable',
      x: 42,
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    const canonical = canonicalizeElement(element);

    expect(canonical).toContain('2024-01-02T00:00:00.000Z');
    expect(canonical).toContain('42');
    expect(canonical).toContain('el-1');
  });
});
