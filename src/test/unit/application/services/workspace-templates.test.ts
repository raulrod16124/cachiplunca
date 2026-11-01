import type { CreateElementInput } from '../../../../application/commands';
import {
  buildWorkspaceTemplateInputs,
  isWorkspaceTemplateId,
  WORKSPACE_TEMPLATE_IDS,
  type WorkspaceTemplateId,
} from '../../../../application/services';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { TASK_STATUSES, type RichTextDocument } from '../../../../domain/element';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

const EXPECTED_COMPOSITION: Record<
  WorkspaceTemplateId,
  { readonly frames: number; readonly notes: number; readonly tasks: number }
> = {
  retrospective: { frames: 3, notes: 5, tasks: 2 },
  'project-kickoff': { frames: 3, notes: 5, tasks: 2 },
  brainstorming: { frames: 3, notes: 5, tasks: 2 },
  kanban: { frames: 4, notes: 0, tasks: 4 },
};

function plainText(value: string | RichTextDocument): string {
  return typeof value === 'string' ? value : '';
}

function build(templateId: WorkspaceTemplateId): readonly CreateElementInput[] {
  return buildWorkspaceTemplateInputs(templateId, {
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
  });
}

function overlaps(first: CreateElementInput, second: CreateElementInput): boolean {
  const firstRight = first.position.x + first.size.width;
  const firstBottom = first.position.y + first.size.height;
  const secondRight = second.position.x + second.size.width;
  const secondBottom = second.position.y + second.size.height;

  return (
    first.position.x < secondRight &&
    second.position.x < firstRight &&
    first.position.y < secondBottom &&
    second.position.y < firstBottom
  );
}

describe('isWorkspaceTemplateId', () => {
  it('accepts every known template and rejects unknown values', () => {
    for (const id of WORKSPACE_TEMPLATE_IDS) {
      expect(isWorkspaceTemplateId(id)).toBe(true);
    }
    expect(isWorkspaceTemplateId('blank')).toBe(false);
    expect(isWorkspaceTemplateId('unknown')).toBe(false);
  });

  it('offers the kanban template', () => {
    expect(WORKSPACE_TEMPLATE_IDS).toContain('kanban');
  });
});

describe('buildWorkspaceTemplateInputs', () => {
  it.each(WORKSPACE_TEMPLATE_IDS)('builds coherent %s elements', (templateId) => {
    const inputs = build(templateId);
    const expected = EXPECTED_COMPOSITION[templateId];

    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.filter((input) => input.type === 'frame')).toHaveLength(expected.frames);
    expect(inputs.filter((input) => input.type === 'note')).toHaveLength(expected.notes);
    expect(inputs.filter((input) => input.type === 'task')).toHaveLength(expected.tasks);

    for (const input of inputs) {
      expect(input.workspaceId.equals(WORKSPACE_ID)).toBe(true);
      expect(input.createdBy.equals(USER_ID)).toBe(true);
      expect(input.size.width).toBeGreaterThan(0);
      expect(input.size.height).toBeGreaterThan(0);
    }
  });

  it.each(WORKSPACE_TEMPLATE_IDS)('keeps %s elements from overlapping', (templateId) => {
    const inputs = build(templateId);

    for (let first = 0; first < inputs.length; first += 1) {
      for (let second = first + 1; second < inputs.length; second += 1) {
        expect(overlaps(inputs[first], inputs[second])).toBe(false);
      }
    }
  });

  it.each(WORKSPACE_TEMPLATE_IDS)('uses non-empty text for %s', (templateId) => {
    const inputs = build(templateId);

    for (const input of inputs) {
      if (input.type === 'frame') {
        expect(plainText(input.title).trim().length).toBeGreaterThan(0);
      }
      if (input.type === 'note') {
        expect(plainText(input.content).trim().length).toBeGreaterThan(0);
      }
      if (input.type === 'task') {
        expect(plainText(input.title).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('builds a kanban board with one task per status and ordered columns', () => {
    const inputs = build('kanban');

    const frames = inputs.filter((input) => input.type === 'frame');
    const tasks = inputs.filter((input) => input.type === 'task');

    expect(frames.map((frame) => plainText(frame.type === 'frame' ? frame.title : ''))).toEqual([
      'Todo',
      'In progress',
      'Completed',
      'Blocked',
    ]);
    expect(tasks.map((task) => (task.type === 'task' ? task.status : undefined))).toEqual([
      ...TASK_STATUSES,
    ]);
    expect(inputs.some((input) => input.type === 'note')).toBe(false);

    const columnsX = frames.map((frame) => frame.position.x);
    expect(columnsX).toEqual([0, 320, 640, 960]);
  });

  it('does not mutate the template definitions between builds', () => {
    const first = build('retrospective');
    const second = build('retrospective');

    expect(first).toHaveLength(second.length);
    expect(first.map((input) => input.type)).toEqual(second.map((input) => input.type));
  });
});
