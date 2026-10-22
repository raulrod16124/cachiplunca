import {
  computeElementDelta,
  createElementPersistence,
  createElementPersistenceOrchestrator,
} from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { isAppError } from '../../../../shared/errors';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function buildTextElement(id: string, x = 10): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(x, 20),
    size: Size.create(120, 80),
    content: `content-${id}`,
  });
}

describe('computeElementDelta', () => {
  it('upserts a new element', () => {
    const existing = buildTextElement('el-1');
    const added = buildTextElement('el-2');
    const delta = computeElementDelta([existing], [existing, added]);

    expect(delta.upserts).toEqual([added]);
    expect(delta.removedIds).toEqual([]);
  });

  it('upserts an element whose reference changed', () => {
    const previous = [buildTextElement('el-1')];
    const moved = buildTextElement('el-1', 50);
    const delta = computeElementDelta(previous, [moved]);

    expect(delta.upserts).toEqual([moved]);
    expect(delta.removedIds).toEqual([]);
  });

  it('does not upsert elements that keep the same reference', () => {
    const unchanged = buildTextElement('el-1');
    const delta = computeElementDelta([unchanged], [unchanged]);

    expect(delta.upserts).toEqual([]);
    expect(delta.removedIds).toEqual([]);
  });

  it('removes ids that are absent from the next collection', () => {
    const kept = buildTextElement('el-1');
    const removed = buildTextElement('el-2');
    const delta = computeElementDelta([kept, removed], [kept]);

    expect(delta.upserts).toEqual([]);
    expect(delta.removedIds).toEqual([removed.id]);
  });

  it('combines upserts and removals in a single delta', () => {
    const removed = buildTextElement('el-1');
    const unchanged = buildTextElement('el-2');
    const added = buildTextElement('el-3');
    const delta = computeElementDelta([removed, unchanged], [unchanged, added]);

    expect(delta.upserts).toEqual([added]);
    expect(delta.removedIds).toEqual([removed.id]);
  });

  it('does not mutate the input collections', () => {
    const previous = [buildTextElement('el-1')];
    const next = [buildTextElement('el-1', 50), buildTextElement('el-2')];

    computeElementDelta(previous, next);

    expect(previous).toHaveLength(1);
    expect(next).toHaveLength(2);
  });
});

describe('createElementPersistenceOrchestrator', () => {
  it('persists upserts and removals through the repository', async () => {
    const repository = new FakeElementRepository();
    const removed = buildTextElement('el-1');
    const kept = buildTextElement('el-2');
    await repository.saveMany([removed, kept]);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const added = buildTextElement('el-3');

    await expect(orchestrator.persistDelta([removed, kept], [kept, added])).resolves.toEqual({
      status: 'ok',
    });
    await expect(repository.listByWorkspace(WORKSPACE_ID)).resolves.toEqual([kept, added]);
  });

  it('is a no-op that does not touch the repository when nothing changed', async () => {
    const repository = new FakeElementRepository();
    const saveMany = jest.spyOn(repository, 'saveMany');
    const deleteMany = jest.spyOn(repository, 'deleteMany');
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    const element = buildTextElement('el-1');

    await expect(orchestrator.persistDelta([element], [element])).resolves.toEqual({
      status: 'ok',
    });
    expect(saveMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('maps a removal failure to an AppError', async () => {
    const repository = new FakeElementRepository();
    const element = buildTextElement('el-1');
    await repository.save(element);
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    jest.spyOn(repository, 'deleteMany').mockRejectedValueOnce(new Error('Delete failed'));

    const result = await orchestrator.persistDelta([element], []);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(isAppError(result.error)).toBe(true);
      expect(result.error.message).toBe('Delete failed');
    }
  });

  it('maps a save failure to an AppError', async () => {
    const repository = new FakeElementRepository();
    const orchestrator = createElementPersistenceOrchestrator(createElementPersistence(repository));
    jest.spyOn(repository, 'saveMany').mockRejectedValueOnce(new Error('Write failed'));

    const result = await orchestrator.persistDelta([], [buildTextElement('el-1')]);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(isAppError(result.error)).toBe(true);
      expect(result.error.message).toBe('Write failed');
    }
  });

  it('touches workspace activity after a successful persisted change', async () => {
    const repository = new FakeElementRepository();
    const touchActivity = jest.fn().mockResolvedValue(undefined);
    const now = new Date('2026-10-22T10:00:00.000Z');
    const orchestrator = createElementPersistenceOrchestrator(
      createElementPersistence(repository),
      { workspaceRepository: { touchActivity }, now: () => now },
    );

    const result = await orchestrator.persistDelta([], [buildTextElement('el-1')], WORKSPACE_ID);

    expect(result).toEqual({ status: 'ok' });
    expect(touchActivity).toHaveBeenCalledWith(WORKSPACE_ID, now);
  });

  it('does not touch activity when nothing changed or no workspace is provided', async () => {
    const repository = new FakeElementRepository();
    const touchActivity = jest.fn().mockResolvedValue(undefined);
    const orchestrator = createElementPersistenceOrchestrator(
      createElementPersistence(repository),
      { workspaceRepository: { touchActivity } },
    );
    const element = buildTextElement('el-1');

    await orchestrator.persistDelta([element], [element], WORKSPACE_ID);
    await orchestrator.persistDelta([], [buildTextElement('el-2')]);

    expect(touchActivity).not.toHaveBeenCalled();
  });

  it('does not touch activity when persistence fails', async () => {
    const repository = new FakeElementRepository();
    const touchActivity = jest.fn().mockResolvedValue(undefined);
    const orchestrator = createElementPersistenceOrchestrator(
      createElementPersistence(repository),
      { workspaceRepository: { touchActivity } },
    );
    jest.spyOn(repository, 'saveMany').mockRejectedValueOnce(new Error('Write failed'));

    await orchestrator.persistDelta([], [buildTextElement('el-1')], WORKSPACE_ID);

    expect(touchActivity).not.toHaveBeenCalled();
  });

  it('treats a failed activity touch as best-effort', async () => {
    const repository = new FakeElementRepository();
    const touchActivity = jest.fn().mockRejectedValue(new Error('Activity failed'));
    const orchestrator = createElementPersistenceOrchestrator(
      createElementPersistence(repository),
      { workspaceRepository: { touchActivity } },
    );

    const result = await orchestrator.persistDelta([], [buildTextElement('el-1')], WORKSPACE_ID);

    expect(result).toEqual({ status: 'ok' });
    expect(touchActivity).toHaveBeenCalledTimes(1);
  });
});
