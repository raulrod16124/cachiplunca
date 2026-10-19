import {
  buildDuplicateWorkspaceName,
  buildWorkspaceCopyElements,
} from '../../../../application/services';
import {
  createConnectorElement,
  createFrameElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  type Element,
} from '../../../../domain/element';
import { WORKSPACE_NAME_MAX_LENGTH } from '../../../../domain/workspace';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const SOURCE_WORKSPACE = WorkspaceId.create('ws-source');
const TARGET_WORKSPACE = WorkspaceId.create('ws-target');
const AUTHOR = UserId.create('user-author');
const ACTOR = UserId.create('user-owner');
const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const NOW = new Date('2025-06-01T12:00:00Z');
const SIZE = Size.create(200, 120);

function baseProps(id: string) {
  return {
    id: ElementId.create(id),
    workspaceId: SOURCE_WORKSPACE,
    createdBy: AUTHOR,
    position: Position.create(10, 20),
    size: SIZE,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function sequentialIds(): () => ElementId {
  let counter = 0;
  return () => {
    counter += 1;
    return ElementId.create(`copy-${counter}`);
  };
}

function copy(elements: readonly Element[]) {
  return buildWorkspaceCopyElements(elements, {
    targetWorkspaceId: TARGET_WORKSPACE,
    createdBy: ACTOR,
    generateId: sequentialIds(),
    now: () => NOW,
  });
}

describe('buildDuplicateWorkspaceName', () => {
  it('prefixes the source name with "Copy of"', () => {
    expect(buildDuplicateWorkspaceName('Roadmap Q4')).toBe('Copy of Roadmap Q4');
  });

  it('trims the source name before copying it', () => {
    expect(buildDuplicateWorkspaceName('  Roadmap Q4  ')).toBe('Copy of Roadmap Q4');
  });

  it('truncates long names to the workspace limit', () => {
    const name = buildDuplicateWorkspaceName('x'.repeat(WORKSPACE_NAME_MAX_LENGTH));

    expect(name).toHaveLength(WORKSPACE_NAME_MAX_LENGTH);
    expect(name.startsWith('Copy of x')).toBe(true);
  });
});

describe('buildWorkspaceCopyElements', () => {
  it('copies every element with fresh ids, workspace and authorship', () => {
    const source = createTextElement({ ...baseProps('text-1'), content: 'hello', zIndex: 4 });

    const result = copy([source]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toEqual({
      ...source,
      id: ElementId.create('copy-1'),
      workspaceId: TARGET_WORKSPACE,
      createdBy: ACTOR,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.elements[0]).not.toBe(source);
  });

  it('preserves geometry, z-order and type-specific data', () => {
    const note = createNoteElement({
      ...baseProps('note-1'),
      content: 'A note',
      color: 'sun',
      rotation: 15,
      zIndex: 7,
    });
    const task = createTaskElement({
      ...baseProps('task-1'),
      title: 'Ship it',
      status: 'in_progress',
      notes: 'Details',
      dueDate: new Date('2025-07-01T00:00:00Z'),
      zIndex: 3,
    });

    const result = copy([note, task]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements[0]).toMatchObject({
      type: 'note',
      position: note.position,
      size: note.size,
      rotation: 15,
      zIndex: 7,
      color: 'sun',
    });
    expect(result.elements[1]).toMatchObject({
      type: 'task',
      position: task.position,
      size: task.size,
      zIndex: 3,
      status: 'in_progress',
      dueDate: task.dueDate,
    });
  });

  it('remaps connector endpoints to the copied elements', () => {
    const source = createTextElement({ ...baseProps('source'), content: 'From' });
    const target = createTextElement({ ...baseProps('target'), content: 'To' });
    const connector = createConnectorElement({
      ...baseProps('connector'),
      sourceElementId: source.id,
      targetElementId: target.id,
    });

    const result = copy([source, target, connector]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const copiedConnector = result.elements[2];
    expect(copiedConnector.type).toBe('connector');
    if (copiedConnector.type !== 'connector') {
      return;
    }
    expect(copiedConnector.sourceElementId?.value).toBe('copy-1');
    expect(copiedConnector.targetElementId?.value).toBe('copy-2');
    expect(copiedConnector.sourceElementId?.value).not.toBe('source');
    expect(copiedConnector.targetElementId?.value).not.toBe('target');
  });

  it('keeps free connector points untouched', () => {
    const connector = createConnectorElement({
      ...baseProps('connector'),
      sourcePoint: Position.create(0, 10),
      targetPoint: Position.create(100, 10),
    });

    const result = copy([connector]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect('sourceElementId' in result.elements[0]).toBe(false);
    expect('targetElementId' in result.elements[0]).toBe(false);
    expect(result.elements[0]).toMatchObject({
      sourcePoint: connector.sourcePoint,
      targetPoint: connector.targetPoint,
    });
  });

  it('remaps the parent frame of nested frames', () => {
    const parent = createFrameElement({ ...baseProps('frame-parent'), title: 'Parent' });
    const child = createFrameElement({
      ...baseProps('frame-child'),
      title: 'Child',
      parentFrameId: parent.id,
    });

    const result = copy([parent, child]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    const copiedChild = result.elements[1];
    expect(copiedChild.type).toBe('frame');
    if (copiedChild.type !== 'frame') {
      return;
    }
    expect(copiedChild.parentFrameId?.value).toBe('copy-1');
  });

  it('drops a parent frame reference that is outside the copied set', () => {
    const child = createFrameElement({
      ...baseProps('frame-child'),
      title: 'Child',
      parentFrameId: ElementId.create('missing-parent'),
    });

    const result = copy([child]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.elements[0].type).toBe('frame');
    if (result.elements[0].type !== 'frame') {
      return;
    }
    expect(result.elements[0].parentFrameId).toBeUndefined();
  });

  it('does not mutate the source elements', () => {
    const source = createTextElement({ ...baseProps('text-1'), content: 'hello' });

    copy([source]);

    expect(source.workspaceId.equals(SOURCE_WORKSPACE)).toBe(true);
    expect(source.id.value).toBe('text-1');
    expect(source.createdAt).toBe(CREATED_AT);
  });

  it('fails with a validation error when a connector points outside the workspace', () => {
    const connector = createConnectorElement({
      ...baseProps('connector'),
      sourceElementId: ElementId.create('missing'),
      targetPoint: Position.create(100, 10),
    });

    const result = copy([connector]);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });
});
