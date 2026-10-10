import {
  createConnectorElement,
  withConnectorSource,
  withConnectorTarget,
} from '../../../../domain/element';
import type { ConnectorElement, CreateConnectorElementProps } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (
  overrides: Partial<CreateConnectorElementProps> = {},
): CreateConnectorElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  sourceElementId: ElementId.create('source'),
  targetElementId: ElementId.create('target'),
  ...overrides,
});

const createSample = (overrides: Partial<CreateConnectorElementProps> = {}): ConnectorElement =>
  createConnectorElement(
    createProps({ createdAt: new Date('2024-01-01T00:00:00Z'), ...overrides }),
  );

describe('ConnectorElement', () => {
  it('creates a valid connector element with sane defaults', () => {
    const element = createConnectorElement(createProps());

    expect(element.type).toBe('connector');
    expect(element.sourceElementId.value).toBe('source');
    expect(element.targetElementId.value).toBe('target');
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createConnectorElement(
      createProps({ position, size, createdAt, updatedAt, rotation: 15 }),
    );

    expect(element.id.value).toBe('elem-1');
    expect(element.workspaceId.value).toBe('ws-1');
    expect(element.createdBy.value).toBe('user-1');
    expect(element.position.equals(position)).toBe(true);
    expect(element.size.equals(size)).toBe(true);
    expect(element.rotation).toBe(15);
    expect(element.createdAt).toBe(createdAt);
    expect(element.updatedAt).toBe(updatedAt);
  });

  it('rejects a non-ElementId source coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { sourceElementId: 'source' });
    expect(() => createConnectorElement(untrusted)).toThrow(/sourceElementId/);
  });

  it('rejects a non-ElementId target coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { targetElementId: 'target' });
    expect(() => createConnectorElement(untrusted)).toThrow(/targetElementId/);
  });

  it('rejects a connector whose source and target are the same', () => {
    expect(() =>
      createConnectorElement(
        createProps({
          sourceElementId: ElementId.create('same'),
          targetElementId: ElementId.create('same'),
        }),
      ),
    ).toThrow(/same/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createConnectorElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createConnectorElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating the source without mutating the original', () => {
    const original = createSample();
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withConnectorSource(original, ElementId.create('source-2'), updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.sourceElementId.value).toBe('source-2');
    expect(updated.targetElementId.value).toBe('target');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.sourceElementId.value).toBe('source');
  });

  it('returns a new element when updating the target without mutating the original', () => {
    const original = createSample();
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withConnectorTarget(original, ElementId.create('target-2'), updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.targetElementId.value).toBe('target-2');
    expect(updated.sourceElementId.value).toBe('source');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.targetElementId.value).toBe('target');
  });

  it('rejects a non-ElementId endpoint on update', () => {
    const original = createSample();
    expect(() => withConnectorSource(original, 'source-2' as unknown as ElementId)).toThrow(
      /sourceElementId/,
    );
    expect(() => withConnectorTarget(original, 'target-2' as unknown as ElementId)).toThrow(
      /targetElementId/,
    );
  });

  it('rejects an update that would make source and target the same', () => {
    const original = createSample();

    expect(() => withConnectorSource(original, original.targetElementId)).toThrow(/same/);
    expect(() => withConnectorTarget(original, original.sourceElementId)).toThrow(/same/);
  });

  it('preserves unrelated fields across updates', () => {
    const original = createSample({ rotation: 15 });

    const updated = withConnectorSource(original, ElementId.create('source-2'));

    expect(updated.targetElementId.value).toBe('target');
    expect(updated.rotation).toBe(15);
    expect(updated.position.equals(original.position)).toBe(true);
    expect(updated.size.equals(original.size)).toBe(true);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createSample({ createdAt: new Date('2024-01-02T00:00:00Z') });

    expect(() =>
      withConnectorTarget(original, ElementId.create('target-2'), new Date('2024-01-01T00:00:00Z')),
    ).toThrow(/updatedAt/);
  });
});
