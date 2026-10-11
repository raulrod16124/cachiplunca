import { copyElements, pasteElements } from '../../../../application/services/element-copy-paste';
import { createNoteElement, createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

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

const textElement = (overrides: Partial<Element> = {}): Element =>
  createTextElement({
    ...baseProps,
    id: ElementId.create('elem-1'),
    content: 'hello',
    ...(overrides as any),
  });

const noteElement = (overrides: Partial<Element> = {}): Element =>
  createNoteElement({
    ...baseProps,
    id: ElementId.create('elem-2'),
    content: 'note',
    color: '#fff3b0',
    ...(overrides as any),
  });

describe('element-copy-paste service', () => {
  it('copies selected elements', () => {
    const elements = [textElement(), noteElement()];
    const result = copyElements(elements, ['elem-1']);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.copiedElements).toHaveLength(1);
      expect(result.copiedElements[0].id.value).toBe('elem-1');
    }
  });

  it('returns empty copied list when no ids match', () => {
    const elements = [textElement()];
    const result = copyElements(elements, ['unknown']);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.copiedElements).toHaveLength(0);
    }
  });

  it('pastes copied elements with offset and new ids', () => {
    const elements = [textElement()];
    const copyResult = copyElements(elements, ['elem-1']);
    expect(copyResult.status).toBe('ok');

    if (copyResult.status === 'ok') {
      const pasteResult = pasteElements([], copyResult.copiedElements, {
        generateId: () => ElementId.create('pasted-1'),
        now: () => NOW,
      });

      expect(pasteResult.status).toBe('ok');
      if (pasteResult.status === 'ok') {
        expect(pasteResult.pastedIds).toEqual(['pasted-1']);
        expect(pasteResult.elements).toHaveLength(1);
        const pasted = pasteResult.elements[0];
        expect(pasted.id.value).toBe('pasted-1');
        expect(pasted.createdAt).toEqual(NOW);
        expect(pasted.updatedAt).toEqual(NOW);
        expect(pasted.position.x).toBe(10 + 16);
        expect(pasted.position.y).toBe(20 + 16);
        expect(pasted.type).toBe('text');
      }
    }
  });

  it('pastes with custom offset', () => {
    const elements = [textElement()];
    const copyResult = copyElements(elements, ['elem-1']);
    expect(copyResult.status).toBe('ok');

    if (copyResult.status === 'ok') {
      const pasteResult = pasteElements([], copyResult.copiedElements, {
        generateId: () => ElementId.create('pasted-1'),
        now: () => NOW,
        offset: Position.create(5, 5),
      });

      expect(pasteResult.status).toBe('ok');
      if (pasteResult.status === 'ok') {
        const pasted = pasteResult.elements[0];
        expect(pasted.position.x).toBe(15);
        expect(pasted.position.y).toBe(25);
      }
    }
  });

  it('returns existing elements unchanged when nothing to paste', () => {
    const elements = [textElement()];
    const pasteResult = pasteElements(elements, [], {
      generateId: () => ElementId.create('pasted-1'),
      now: () => NOW,
    });

    expect(pasteResult.status).toBe('ok');
    if (pasteResult.status === 'ok') {
      expect(pasteResult.elements).toEqual(elements);
      expect(pasteResult.pastedIds).toEqual([]);
    }
  });
});
