import {
  createTaskElement,
  withTaskAssignee,
  withTaskDueDate,
  withTaskStatus,
  withTaskTitle,
} from '../../../../domain/element';
import type { CreateTaskElementProps, TaskElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createProps = (overrides: Partial<CreateTaskElementProps> = {}): CreateTaskElementProps => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  title: 'ship the MVP',
  status: 'todo',
  ...overrides,
});

const createSample = (overrides: Partial<CreateTaskElementProps> = {}): TaskElement =>
  createTaskElement(createProps({ createdAt: new Date('2024-01-01T00:00:00Z'), ...overrides }));

describe('TaskElement', () => {
  it('creates a valid task element with sane defaults', () => {
    const element = createTaskElement(createProps());

    expect(element.type).toBe('task');
    expect(element.title).toBe('ship the MVP');
    expect(element.status).toBe('todo');
    expect(element.assigneeId).toBeUndefined();
    expect(element.dueDate).toBeUndefined();
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('creates a task element with assignee and due date', () => {
    const assigneeId = UserId.create('user-2');
    const dueDate = new Date('2024-02-01T00:00:00Z');

    const element = createTaskElement(createProps({ assigneeId, dueDate }));

    expect(element.assigneeId?.value).toBe('user-2');
    expect(element.dueDate).toBe(dueDate);
  });

  it('keeps provided position, size, identity and timestamps', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const element = createTaskElement(
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

  it('rejects undefined title', () => {
    expect(() => createTaskElement(createProps({ title: undefined }))).toThrow(/title/);
  });

  it('rejects empty or whitespace-only title coming from untrusted data', () => {
    expect(() => createTaskElement(createProps({ title: '' }))).toThrow(/title/);
    expect(() => createTaskElement(createProps({ title: '   ' }))).toThrow(/title/);
  });

  it('rejects non-string title coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { title: 123 });
    expect(() => createTaskElement(untrusted)).toThrow(/title/);
  });

  it('rejects an unknown status coming from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { status: 'archived' });
    expect(() => createTaskElement(untrusted)).toThrow(/status/);
  });

  it('rejects a non-string status', () => {
    const untrusted = Object.assign(createProps(), { status: 123 });
    expect(() => createTaskElement(untrusted)).toThrow(/status/);
  });

  it('rejects an invalid due date', () => {
    expect(() => createTaskElement(createProps({ dueDate: new Date('invalid') }))).toThrow(
      /dueDate/,
    );
    const untrusted = Object.assign(createProps(), { dueDate: 123 });
    expect(() => createTaskElement(untrusted)).toThrow(/dueDate/);
  });

  it('rejects an invalid assignee from untrusted data', () => {
    const untrusted = Object.assign(createProps(), { assigneeId: 'user-2' });
    expect(() => createTaskElement(untrusted)).toThrow(/assigneeId/);
  });

  it('rejects non-finite rotation', () => {
    expect(() => createTaskElement(createProps({ rotation: Number.NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    expect(() =>
      createTaskElement(
        createProps({
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        }),
      ),
    ).toThrow(/createdAt/);
  });

  it('returns a new element when updating the title without mutating the original', () => {
    const original = createSample();
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withTaskTitle(original, 'updated title', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.title).toBe('updated title');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.title).toBe('ship the MVP');
  });

  it('rejects an invalid title on update', () => {
    const original = createSample();
    expect(() => withTaskTitle(original, '   ')).toThrow(/title/);
  });

  it('updates the status without mutating the original', () => {
    const original = createSample();
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const updated = withTaskStatus(original, 'done', updatedAt);

    expect(updated).not.toBe(original);
    expect(updated.status).toBe('done');
    expect(updated.updatedAt).toBe(updatedAt);
    expect(original.status).toBe('todo');
  });

  it('rejects an unknown status on update', () => {
    const original = createSample();
    const corrupted = Object.assign(createSample(), { status: 'archived' });
    expect(() => withTaskStatus(original, corrupted.status)).toThrow(/status/);
  });

  it('assigns and clears the assignee without mutating the original', () => {
    const original = createSample();
    const assigneeId = UserId.create('user-2');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const assigned = withTaskAssignee(original, assigneeId, updatedAt);
    const cleared = withTaskAssignee(assigned, undefined, updatedAt);

    expect(assigned).not.toBe(original);
    expect(assigned.assigneeId?.value).toBe('user-2');
    expect(original.assigneeId).toBeUndefined();
    expect(cleared.assigneeId).toBeUndefined();
    expect('assigneeId' in cleared).toBe(false);
  });

  it('sets and clears the due date without mutating the original', () => {
    const original = createSample();
    const dueDate = new Date('2024-02-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');

    const scheduled = withTaskDueDate(original, dueDate, updatedAt);
    const cleared = withTaskDueDate(scheduled, undefined, updatedAt);

    expect(scheduled.dueDate).toBe(dueDate);
    expect(original.dueDate).toBeUndefined();
    expect(cleared.dueDate).toBeUndefined();
    expect('dueDate' in cleared).toBe(false);
  });

  it('rejects an invalid due date on update', () => {
    const original = createSample();
    expect(() => withTaskDueDate(original, new Date('invalid'))).toThrow(/dueDate/);
  });

  it('preserves unrelated fields across updates', () => {
    const assigneeId = UserId.create('user-2');
    const dueDate = new Date('2024-02-01T00:00:00Z');
    const original = createSample({ assigneeId, dueDate, rotation: 15 });

    const updated = withTaskTitle(original, 'next title');

    expect(updated.status).toBe(original.status);
    expect(updated.assigneeId?.value).toBe('user-2');
    expect(updated.dueDate).toBe(dueDate);
    expect(updated.rotation).toBe(15);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('rejects an update whose updatedAt predates createdAt', () => {
    const original = createSample({ createdAt: new Date('2024-01-02T00:00:00Z') });

    expect(() => withTaskTitle(original, 'next', new Date('2024-01-01T00:00:00Z'))).toThrow(
      /updatedAt/,
    );
  });
});
