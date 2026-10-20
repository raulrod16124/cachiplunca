import type { ElementRepository } from '../../application/ports';
import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  ELEMENT_TYPES,
  type Element,
  type ElementType,
} from '../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import { ERROR_CODES, isAppError } from '../../shared/errors';

type RepositoryFactory = () => ElementRepository | Promise<ElementRepository>;

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');

interface BuildElementOverrides {
  readonly id?: string;
  readonly workspaceId?: WorkspaceId;
}

function buildElement(type: ElementType, overrides: BuildElementOverrides = {}): Element {
  const id = ElementId.create(overrides.id ?? `el-${type}`);
  const workspaceId = overrides.workspaceId ?? WORKSPACE_ID;
  const base = {
    id,
    workspaceId,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    rotation: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  switch (type) {
    case 'text':
      return createTextElement({ ...base, content: 'Hello' });
    case 'note':
      return createNoteElement({ ...base, content: 'Note', color: '#fff' });
    case 'task':
      return createTaskElement({ ...base, title: 'Task', status: 'todo' });
    case 'frame':
      return createFrameElement({ ...base, title: 'Frame' });
    case 'connector':
      return createConnectorElement({
        ...base,
        sourceElementId: ElementId.create('el-a'),
        targetElementId: ElementId.create('el-b'),
      });
    case 'link':
      return createLinkElement({ ...base, url: 'https://example.com', title: 'Example' });
    case 'image':
      return createImageElement({
        ...base,
        src: 'https://example.com/image.png',
        alt: 'Example image',
      });
  }
}

function expectSameElement(actual: Element | null, expected: Element): void {
  if (actual === null) {
    throw new Error('Expected the repository to return an element, got null');
  }
  expect(actual).toEqual(expected);
  expect(actual.type).toBe(expected.type);
  expect(actual.position.equals(expected.position)).toBe(true);
  expect(actual.size.equals(expected.size)).toBe(true);
}

export function describeElementRepositoryContract(
  suiteName: string,
  createRepository: RepositoryFactory,
): void {
  describe(suiteName, () => {
    let repository: ElementRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts with no elements for a workspace', async () => {
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('saves an element and exposes it through list and findById', async () => {
      const element = buildElement('text');

      const saved = await repository.save(element);
      expectSameElement(saved, element);

      const listed = await repository.listByWorkspace(WORKSPACE_ID);
      expect(listed).toHaveLength(1);
      expectSameElement(listed[0], element);

      expectSameElement(await repository.findById(element.id), element);
    });

    it('round-trips every MVP element type keeping position, size and type-specific fields', async () => {
      for (const type of ELEMENT_TYPES) {
        const element = buildElement(type, { id: `el-${type}` });
        await repository.save(element);

        const stored = await repository.findById(element.id);
        expect(stored?.type).toBe(type);
        expectSameElement(stored, element);
      }

      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toHaveLength(
        ELEMENT_TYPES.length,
      );
    });

    it('returns null from findById for an unknown id', async () => {
      expect(await repository.findById(ElementId.create('missing'))).toBeNull();
    });

    it('replaces an existing element without duplicating it', async () => {
      const original = buildElement('text', { id: 'el-1' });
      await repository.save(original);

      const replacement = createTextElement({
        id: original.id,
        workspaceId: WORKSPACE_ID,
        createdBy: USER_ID,
        position: Position.create(0, 0),
        size: Size.create(1, 1),
        content: 'Replaced',
        createdAt: original.createdAt,
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      });

      expectSameElement(await repository.save(replacement), replacement);

      const listed = await repository.listByWorkspace(WORKSPACE_ID);
      expect(listed).toHaveLength(1);
      expectSameElement(listed[0], replacement);
    });

    it('isolates elements by workspace', async () => {
      const here = buildElement('text', { id: 'el-here' });
      const elsewhere = buildElement('note', {
        id: 'el-elsewhere',
        workspaceId: OTHER_WORKSPACE_ID,
      });

      await repository.save(here);
      await repository.save(elsewhere);

      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([here]);
      await expect(repository.listByWorkspace(OTHER_WORKSPACE_ID)).resolves.toEqual([elsewhere]);
    });

    it('saves a batch with saveMany', async () => {
      const batch = [
        buildElement('text', { id: 'el-1' }),
        buildElement('note', { id: 'el-2' }),
        buildElement('task', { id: 'el-3' }),
      ];

      const saved = await repository.saveMany(batch);
      expect(saved).toEqual(batch);

      const listed = await repository.listByWorkspace(WORKSPACE_ID);
      expect(listed).toHaveLength(batch.length);
      expect(listed).toEqual(expect.arrayContaining(batch));
    });

    it('deletes an element and stops exposing it', async () => {
      const element = buildElement('text', { id: 'el-1' });
      await repository.save(element);

      await expect(repository.delete(element.id)).resolves.toBeUndefined();

      expect(await repository.findById(element.id)).toBeNull();
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('deletes a batch with deleteMany', async () => {
      const batch = [buildElement('text', { id: 'el-1' }), buildElement('note', { id: 'el-2' })];
      await repository.saveMany(batch);

      await expect(
        repository.deleteMany(batch.map((element) => element.id)),
      ).resolves.toBeUndefined();

      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('rejects delete with a notFound AppError for an unknown id', async () => {
      await expect(repository.delete(ElementId.create('missing'))).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });
    });

    it('rejects deleteMany when any id is unknown and keeps the known element intact', async () => {
      const element = buildElement('text', { id: 'el-1' });
      await repository.save(element);

      await expect(
        repository.deleteMany([element.id, ElementId.create('missing')]),
      ).rejects.toMatchObject({
        kind: 'notFound',
        code: ERROR_CODES.NOT_FOUND_RESOURCE,
      });

      expectSameElement(await repository.findById(element.id), element);
    });

    it('rejects save with a validation AppError and keeps the store intact', async () => {
      const invalid = {
        ...buildElement('task', { id: 'el-task' }),
        title: '',
      } as unknown as Element;

      await expect(repository.save(invalid)).rejects.toMatchObject({
        kind: 'validation',
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
      });
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('rejects every failing operation with an AppError instead of a raw error', async () => {
      const unknownId = ElementId.create('missing');
      const invalid = {
        ...buildElement('text', { id: 'el-invalid' }),
        content: undefined,
      } as unknown as Element;

      const operations = [
        repository.save(invalid),
        repository.delete(unknownId),
        repository.deleteMany([unknownId]),
      ];

      for (const operation of operations) {
        const error: unknown = await operation.catch((reason: unknown) => reason);
        expect(isAppError(error)).toBe(true);
      }
    });
  });
}
