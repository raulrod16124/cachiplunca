import type { CreateElementInput } from '../../../../application/commands';
import {
  buildWorkspaceTemplateInputs,
  isWorkspaceTemplateId,
  WORKSPACE_TEMPLATE_IDS,
  type WorkspaceTemplateId,
} from '../../../../application/services';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import type { RichTextDocument } from '../../../../domain/element';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

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
});

describe('buildWorkspaceTemplateInputs', () => {
  it.each(WORKSPACE_TEMPLATE_IDS)('builds coherent %s elements', (templateId) => {
    const inputs = build(templateId);

    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.some((input) => input.type === 'frame')).toBe(true);
    expect(inputs.some((input) => input.type === 'note')).toBe(true);
    expect(inputs.some((input) => input.type === 'task')).toBe(true);

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

  it('does not mutate the template definitions between builds', () => {
    const first = build('retrospective');
    const second = build('retrospective');

    expect(first).toHaveLength(second.length);
    expect(first.map((input) => input.type)).toEqual(second.map((input) => input.type));
  });
});
