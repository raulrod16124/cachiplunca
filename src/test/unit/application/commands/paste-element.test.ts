import { createPasteElement } from '../../../../application/commands';
import { createTextElement, isTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const NOW = new Date('2024-06-01T00:00:00Z');

const baseProps = {
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(10, 20),
  size: Size.create(100, 40),
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const textElement = (): Element =>
  createTextElement({
    ...baseProps,
    id: ElementId.create('elem-1'),
    content: 'hello',
  });

const makeCommand = () =>
  createPasteElement({ generateId: () => ElementId.create('new-id'), now: () => NOW });

describe('createPasteElement', () => {
  it('creates a new element instance with new id and timestamps', () => {
    const source = textElement();
    const result = makeCommand()({ element: source });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.id.value).toBe('new-id');
      expect(result.element.createdAt).toEqual(NOW);
      expect(result.element.updatedAt).toEqual(NOW);
      if (isTextElement(result.element)) {
        expect(result.element.content).toBe('hello');
      }
    }
  });

  it('applies custom position when provided', () => {
    const source = textElement();
    const result = makeCommand()({ element: source, position: Position.create(50, 60) });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.position.x).toBe(50);
      expect(result.element.position.y).toBe(60);
    }
  });

  it('returns validation error for invalid source element', () => {
    const source: any = { ...textElement() };
    source.content = null;
    const result = makeCommand()({ element: source });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });
});
