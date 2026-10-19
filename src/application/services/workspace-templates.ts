import type { TaskStatus } from '../../domain/element';
import { Position, Size, type UserId, type WorkspaceId } from '../../domain/shared';
import type { CreateElementInput } from '../commands/create-element';

export const WORKSPACE_TEMPLATE_IDS = [
  'retrospective',
  'project-kickoff',
  'brainstorming',
] as const;

export type WorkspaceTemplateId = (typeof WORKSPACE_TEMPLATE_IDS)[number];

export function isWorkspaceTemplateId(value: unknown): value is WorkspaceTemplateId {
  return typeof value === 'string' && (WORKSPACE_TEMPLATE_IDS as readonly string[]).includes(value);
}

interface TemplateRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

type TemplateElementSpec =
  | { readonly type: 'frame'; readonly title: string; readonly rect: TemplateRectangle }
  | { readonly type: 'note'; readonly content: string; readonly rect: TemplateRectangle }
  | {
      readonly type: 'task';
      readonly title: string;
      readonly status: TaskStatus;
      readonly notes?: string;
      readonly rect: TemplateRectangle;
    };

export interface WorkspaceTemplateDefinition {
  readonly id: WorkspaceTemplateId;
  readonly elements: readonly TemplateElementSpec[];
}

const FRAME_SIZE = { width: 280, height: 56 } as const;
const NOTE_SIZE = { width: 280, height: 140 } as const;
const TASK_SIZE = { width: 280, height: 96 } as const;
const COLUMN_X = [0, 320, 640] as const;
const CONTENT_Y = [80, 240, 400] as const;

function frame(title: string, column: 0 | 1 | 2): TemplateElementSpec {
  return {
    type: 'frame',
    title,
    rect: { x: COLUMN_X[column], y: 0, ...FRAME_SIZE },
  };
}

function note(content: string, column: 0 | 1 | 2, row: 0 | 1 | 2): TemplateElementSpec {
  return {
    type: 'note',
    content,
    rect: { x: COLUMN_X[column], y: CONTENT_Y[row], ...NOTE_SIZE },
  };
}

function task(
  title: string,
  column: 0 | 1 | 2,
  row: 0 | 1 | 2,
  status: TaskStatus,
): TemplateElementSpec {
  return {
    type: 'task',
    title,
    status,
    rect: { x: COLUMN_X[column], y: CONTENT_Y[row], ...TASK_SIZE },
  };
}

export const WORKSPACE_TEMPLATES: Readonly<
  Record<WorkspaceTemplateId, WorkspaceTemplateDefinition>
> = {
  retrospective: {
    id: 'retrospective',
    elements: [
      frame('What went well', 0),
      frame('What to improve', 1),
      frame('Action items', 2),
      note('Shipping felt smooth and the team stayed aligned.', 0, 0),
      note('Pairing sessions helped unblock tricky parts early.', 0, 1),
      note('Reviews arrived late and slowed the final stretch.', 1, 0),
      note('Too many open threads at the same time.', 1, 1),
      note('Turn the recurring friction into a documented checklist.', 2, 0),
      task('Add release checklist', 2, 1, 'todo'),
      task('Schedule a weekly review', 2, 2, 'todo'),
    ],
  },
  'project-kickoff': {
    id: 'project-kickoff',
    elements: [
      frame('Goals', 0),
      frame('Scope', 1),
      frame('Next steps', 2),
      note('Describe the outcome we want to achieve.', 0, 0),
      note('Define the success metrics for the first milestone.', 0, 1),
      note('List what is in scope for this project.', 1, 0),
      note('List what is explicitly out of scope.', 1, 1),
      note('Capture open questions to resolve during kickoff.', 2, 0),
      task('Schedule the kickoff meeting', 2, 1, 'todo'),
      task('Assign owners for each workstream', 2, 2, 'todo'),
    ],
  },
  brainstorming: {
    id: 'brainstorming',
    elements: [
      frame('Problem', 0),
      frame('Ideas', 1),
      frame('Questions', 2),
      note('What problem are we trying to solve?', 0, 0),
      note('First idea to explore with the team.', 1, 0),
      note('Second idea, even if it feels rough.', 1, 1),
      note('Third idea to compare later.', 1, 2),
      note('Which assumptions should we test first?', 2, 0),
      task('Cluster and prioritize the ideas', 2, 1, 'todo'),
      task('Schedule a follow-up to decide', 2, 2, 'todo'),
    ],
  },
};

export interface BuildWorkspaceTemplateInputsDeps {
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
}

export function buildWorkspaceTemplateInputs(
  templateId: WorkspaceTemplateId,
  deps: BuildWorkspaceTemplateInputsDeps,
): readonly CreateElementInput[] {
  const template = WORKSPACE_TEMPLATES[templateId];
  const base = (rect: TemplateRectangle) => ({
    workspaceId: deps.workspaceId,
    createdBy: deps.createdBy,
    position: Position.create(rect.x, rect.y),
    size: Size.create(rect.width, rect.height),
  });

  return template.elements.map((spec) => {
    switch (spec.type) {
      case 'frame':
        return { ...base(spec.rect), type: 'frame', title: spec.title };
      case 'note':
        return { ...base(spec.rect), type: 'note', content: spec.content };
      case 'task':
        return {
          ...base(spec.rect),
          type: 'task',
          title: spec.title,
          status: spec.status,
          ...(spec.notes === undefined ? {} : { notes: spec.notes }),
        };
    }
  });
}
