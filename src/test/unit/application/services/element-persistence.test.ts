import { createElementPersistence } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildTextElement(id: string): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    content: `content-${id}`,
  });
}

describe('createElementPersistence', () => {
  describe('save', () => {
    it('persists a single element and exposes it through the repository', async () => {
      const repository = new FakeElementRepository();
      const persistence = createElementPersistence(repository);
      const element = buildTextElement('el-1');

      await expect(persistence.save(element)).resolves.toEqual({ status: 'ok' });
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([element]);
    });

    it('maps a repository failure to an AppError instead of leaking the raw error', async () => {
      const repository = new FakeElementRepository();
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Database down'));
      const persistence = createElementPersistence(repository);

      const result = await persistence.save(buildTextElement('el-1'));

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Database down');
      }
    });
  });

  describe('saveMany', () => {
    it('persists every element in the batch', async () => {
      const repository = new FakeElementRepository();
      const persistence = createElementPersistence(repository);
      const batch = [buildTextElement('el-1'), buildTextElement('el-2')];

      await expect(persistence.saveMany(batch)).resolves.toEqual({ status: 'ok' });
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual(batch);
    });

    it('is a no-op for an empty batch and does not touch the repository', async () => {
      const repository = new FakeElementRepository();
      const spy = jest.spyOn(repository, 'saveMany');
      const persistence = createElementPersistence(repository);

      await expect(persistence.saveMany([])).resolves.toEqual({ status: 'ok' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('maps a repository failure to an AppError', async () => {
      const repository = new FakeElementRepository();
      jest.spyOn(repository, 'saveMany').mockRejectedValueOnce(new Error('Write failed'));
      const persistence = createElementPersistence(repository);

      const result = await persistence.saveMany([buildTextElement('el-1')]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(isAppError(result.error)).toBe(true);
        expect(result.error.message).toBe('Write failed');
      }
    });
  });

  describe('remove', () => {
    it('removes an existing element', async () => {
      const repository = new FakeElementRepository();
      const element = buildTextElement('el-1');
      await repository.save(element);
      const persistence = createElementPersistence(repository);

      await expect(persistence.remove(element.id)).resolves.toEqual({ status: 'ok' });
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('maps a not-found failure to an AppError', async () => {
      const repository = new FakeElementRepository();
      const persistence = createElementPersistence(repository);

      const result = await persistence.remove(ElementId.create('missing'));

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('notFound');
        expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
      }
    });
  });

  describe('removeMany', () => {
    it('removes every element in the batch', async () => {
      const repository = new FakeElementRepository();
      const batch = [buildTextElement('el-1'), buildTextElement('el-2')];
      await repository.saveMany(batch);
      const persistence = createElementPersistence(repository);

      await expect(persistence.removeMany(batch.map((element) => element.id))).resolves.toEqual({
        status: 'ok',
      });
      await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([]);
    });

    it('is a no-op for an empty batch and does not touch the repository', async () => {
      const repository = new FakeElementRepository();
      const spy = jest.spyOn(repository, 'deleteMany');
      const persistence = createElementPersistence(repository);

      await expect(persistence.removeMany([])).resolves.toEqual({ status: 'ok' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('maps a repository failure to an AppError', async () => {
      const repository = new FakeElementRepository();
      jest.spyOn(repository, 'deleteMany').mockRejectedValueOnce(new Error('Delete failed'));
      const persistence = createElementPersistence(repository);

      const result = await persistence.removeMany([ElementId.create('el-1')]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(isAppError(result.error)).toBe(true);
        expect(result.error.message).toBe('Delete failed');
      }
    });
  });

  it('does not mutate the input collections', async () => {
    const repository = new FakeElementRepository();
    const persistence = createElementPersistence(repository);
    const batch = [buildTextElement('el-1'), buildTextElement('el-2')];
    const ids = batch.map((element) => element.id);

    await persistence.saveMany(batch);
    await persistence.removeMany(ids);

    expect(batch).toHaveLength(2);
    expect(ids).toHaveLength(2);
  });
});
