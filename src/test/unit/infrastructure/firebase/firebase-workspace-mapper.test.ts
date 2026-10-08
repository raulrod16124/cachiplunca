import {
  fromWorkspaceDocument,
  toWorkspaceDocument,
} from '../../../../infrastructure/firebase/firebase-workspace-mapper';
import { WorkspaceId } from '../../../../domain/shared';
import { Workspace } from '../../../../domain/workspace';

function makeWorkspace(): Workspace {
  return Workspace.create({
    id: WorkspaceId.create('ws-1'),
    name: 'Product roadmap',
    description: 'notes',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });
}

describe('firebase-workspace-mapper', () => {
  describe('toWorkspaceDocument', () => {
    it('serializes the entity fields into a plain document', () => {
      const workspace = makeWorkspace();

      expect(toWorkspaceDocument(workspace)).toEqual({
        name: 'Product roadmap',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        description: 'notes',
      });
    });

    it('serializes a null description', () => {
      const workspace = Workspace.create({ id: WorkspaceId.create('ws-2'), name: 'No notes' });

      expect(toWorkspaceDocument(workspace).description).toBeNull();
    });
  });

  describe('fromWorkspaceDocument', () => {
    it('rebuilds an equivalent entity from a stored document', () => {
      const workspace = makeWorkspace();

      const rebuilt = fromWorkspaceDocument('ws-1', toWorkspaceDocument(workspace));

      expect(rebuilt).toBeInstanceOf(Workspace);
      expect(rebuilt.id.equals(workspace.id)).toBe(true);
      expect(rebuilt.name).toBe(workspace.name);
      expect(rebuilt.description).toBe(workspace.description);
      expect(rebuilt.createdAt.getTime()).toBe(workspace.createdAt.getTime());
      expect(rebuilt.updatedAt.getTime()).toBe(workspace.updatedAt.getTime());
    });

    it('accepts Timestamp-like date fields', () => {
      const createdAt = new Date('2026-03-01T00:00:00.000Z');
      const updatedAt = new Date('2026-03-01T01:00:00.000Z');

      const workspace = fromWorkspaceDocument('ws-3', {
        name: 'From timestamp',
        description: null,
        createdAt: { toDate: () => createdAt },
        updatedAt: { toDate: () => updatedAt },
      });

      expect(workspace.createdAt.getTime()).toBe(createdAt.getTime());
      expect(workspace.updatedAt.getTime()).toBe(updatedAt.getTime());
    });

    it('normalizes a missing description to null', () => {
      const workspace = fromWorkspaceDocument('ws-4', {
        name: 'Untyped description',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(workspace.description).toBeNull();
    });

    it('rejects data that is not an object', () => {
      expect(() => fromWorkspaceDocument('ws-5', 'not an object')).toThrow(
        'Workspace document must be an object',
      );
      expect(() => fromWorkspaceDocument('ws-5', null)).toThrow(
        'Workspace document must be an object',
      );
      expect(() => fromWorkspaceDocument('ws-5', ['name'])).toThrow(
        'Workspace document must be an object',
      );
    });

    it('rejects a missing or non-string name', () => {
      expect(() =>
        fromWorkspaceDocument('ws-6', { createdAt: new Date(), updatedAt: new Date() }),
      ).toThrow('Workspace document field "name" must be a string');
      expect(() =>
        fromWorkspaceDocument('ws-6', {
          name: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('Workspace document field "name" must be a string');
    });

    it('rejects a missing or malformed date field', () => {
      expect(() => fromWorkspaceDocument('ws-7', { name: 'No dates' })).toThrow(
        'Workspace document field "createdAt" must be a Date or Timestamp',
      );
      expect(() =>
        fromWorkspaceDocument('ws-7', {
          name: 'Bad date',
          createdAt: '2026-01-01',
          updatedAt: new Date(),
        }),
      ).toThrow('Workspace document field "createdAt" must be a Date or Timestamp');
      expect(() =>
        fromWorkspaceDocument('ws-7', {
          name: 'Invalid date',
          createdAt: new Date('not a date'),
          updatedAt: new Date(),
        }),
      ).toThrow('Workspace document field "createdAt" must be a valid Date');
    });

    it('rejects a description that is neither string nor null', () => {
      expect(() =>
        fromWorkspaceDocument('ws-8', {
          name: 'Bad description',
          description: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('Workspace document field "description" must be a string or null');
    });

    it('rejects an empty document id', () => {
      expect(() =>
        fromWorkspaceDocument('   ', {
          name: 'No id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('WorkspaceId cannot be empty');
    });

    it('rejects timestamps that break domain invariants', () => {
      expect(() =>
        fromWorkspaceDocument('ws-9', {
          name: 'Reversed timestamps',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ).toThrow('Updated at cannot be before created at');
    });
  });
});
