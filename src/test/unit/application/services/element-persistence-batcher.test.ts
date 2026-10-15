import {
  createElementPersistenceBatcher,
  DEFAULT_PERSIST_DEBOUNCE_MS,
  type ElementPersistenceOrchestrator,
} from '../../../../application/services';
import type { PersistElementMutationResult } from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, type AppError } from '../../../../shared/errors';
import { ManualScheduler, flushMicrotasks } from '../../../fixtures/manual-scheduler';

function buildTextElement(id: string, x: number): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, 20),
    size: Size.create(120, 80),
    content: `content-${id}`,
  });
}

interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

const OK: PersistElementMutationResult = { status: 'ok' };

describe('createElementPersistenceBatcher', () => {
  it('defaults to a 300ms debounce', () => {
    expect(DEFAULT_PERSIST_DEBOUNCE_MS).toBe(300);
  });

  it('does not persist before the scheduled flush elapses', () => {
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(OK),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 40)]);

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();
    expect(scheduler.pending).toBe(1);
  });

  it('coalesces rapid schedules into a single delta from the earliest previous to the latest next', async () => {
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(OK),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    const previous = [buildTextElement('el-1', 0)];
    const first = [buildTextElement('el-1', 10)];
    const second = [buildTextElement('el-1', 20)];
    const third = [buildTextElement('el-1', 30)];

    batcher.schedule(previous, first);
    batcher.schedule(first, second);
    batcher.schedule(second, third);

    expect(scheduler.pending).toBe(1);

    scheduler.run();
    await flushMicrotasks();

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
    expect(orchestrator.persistDelta).toHaveBeenCalledWith(previous, third);
  });

  it('flushes pending work immediately and cancels the scheduled flush', async () => {
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(OK),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    const previous = [buildTextElement('el-1', 0)];
    const next = [buildTextElement('el-1', 40)];
    batcher.schedule(previous, next);

    await batcher.flush();

    expect(orchestrator.persistDelta).toHaveBeenCalledWith(previous, next);
    expect(scheduler.pending).toBe(0);

    scheduler.run();
    await flushMicrotasks();

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);
  });

  it('does nothing when flushed without pending work', async () => {
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(OK),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    await batcher.flush();

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();
  });

  it('forwards every persistence result to onResult', async () => {
    const scheduler = new ManualScheduler();
    const error: PersistElementMutationResult = {
      status: 'error',
      error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'Write failed'),
    };
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(error),
    };
    const onResult = jest.fn();
    const batcher = createElementPersistenceBatcher({ orchestrator, onResult, scheduler });

    batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
    scheduler.run();
    await flushMicrotasks();

    expect(onResult).toHaveBeenCalledWith(error);
  });

  it('serializes overlapping flushes so writes never run concurrently', async () => {
    const scheduler = new ManualScheduler();
    const deferreds = [createDeferred(), createDeferred()];
    let inFlight = 0;
    let maxInFlight = 0;
    let callIndex = 0;

    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockImplementation(async () => {
        const deferred = deferreds[callIndex];
        callIndex += 1;
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await deferred?.promise;
        inFlight -= 1;
        return OK;
      }),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
    scheduler.run();
    batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);
    const flush = batcher.flush();

    await flushMicrotasks();
    deferreds[0]?.resolve();
    await flushMicrotasks();
    deferreds[1]?.resolve();
    await flush;

    expect(orchestrator.persistDelta).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
  });

  it('ignores schedules after dispose and drops pending work', async () => {
    const scheduler = new ManualScheduler();
    const orchestrator: ElementPersistenceOrchestrator = {
      persistDelta: jest.fn().mockResolvedValue(OK),
    };
    const batcher = createElementPersistenceBatcher({ orchestrator, scheduler });

    batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
    batcher.dispose();
    batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);

    expect(scheduler.pending).toBe(0);

    scheduler.run();
    await flushMicrotasks();

    expect(orchestrator.persistDelta).not.toHaveBeenCalled();
  });

  describe('optimistic rollback', () => {
    it('notifies onMutationFailed with the failed coalesced mutation and error', async () => {
      const scheduler = new ManualScheduler();
      const appError = createAppError(
        'persistence',
        ERROR_CODES.PERSISTENCE_WRITE_FAILED,
        'Write failed',
      );
      const error: PersistElementMutationResult = { status: 'error', error: appError };
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockResolvedValue(error),
      };
      const onMutationFailed = jest.fn();
      const batcher = createElementPersistenceBatcher({
        orchestrator,
        onMutationFailed,
        scheduler,
      });

      const previous = [buildTextElement('el-1', 0)];
      const next = [buildTextElement('el-1', 10)];
      batcher.schedule(previous, next);
      scheduler.run();
      await flushMicrotasks();

      expect(onMutationFailed).toHaveBeenCalledWith({ previous, next }, appError);
    });

    it('does not notify onMutationFailed on a successful flush', async () => {
      const scheduler = new ManualScheduler();
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockResolvedValue(OK),
      };
      const onMutationFailed = jest.fn();
      const batcher = createElementPersistenceBatcher({
        orchestrator,
        onMutationFailed,
        scheduler,
      });

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      scheduler.run();
      await flushMicrotasks();

      expect(onMutationFailed).not.toHaveBeenCalled();
    });

    it('drops pending work after a failure and accepts a fresh schedule', async () => {
      const scheduler = new ManualScheduler();
      const deferred = createDeferred();
      const appError = createAppError(
        'persistence',
        ERROR_CODES.PERSISTENCE_WRITE_FAILED,
        'Write failed',
      );
      const error: PersistElementMutationResult = { status: 'error', error: appError };
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest
          .fn()
          .mockImplementationOnce(async () => {
            await deferred.promise;
            return error;
          })
          .mockResolvedValue(OK),
      };
      const onMutationFailed = jest.fn();
      const batcher = createElementPersistenceBatcher({
        orchestrator,
        onMutationFailed,
        scheduler,
      });

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      scheduler.run();
      await flushMicrotasks();

      batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);
      expect(scheduler.pending).toBe(1);

      deferred.resolve();
      await flushMicrotasks();

      expect(onMutationFailed).toHaveBeenCalledTimes(1);
      expect(scheduler.pending).toBe(0);
      expect(orchestrator.persistDelta).toHaveBeenCalledTimes(1);

      batcher.schedule([buildTextElement('el-1', 20)], [buildTextElement('el-1', 30)]);
      scheduler.run();
      await flushMicrotasks();

      expect(orchestrator.persistDelta).toHaveBeenCalledTimes(2);
      expect(onMutationFailed).toHaveBeenCalledTimes(1);
    });

    it('normalizes an unexpected orchestrator rejection instead of poisoning the queue', async () => {
      const scheduler = new ManualScheduler();
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(OK),
      };
      let capturedError: AppError | undefined;
      const onMutationFailed = jest.fn((_mutation, error: AppError) => {
        capturedError = error;
      });
      const onStatusChange = jest.fn();
      const batcher = createElementPersistenceBatcher({
        orchestrator,
        onMutationFailed,
        onStatusChange,
        scheduler,
      });

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      scheduler.run();
      await flushMicrotasks();

      expect(onStatusChange).toHaveBeenLastCalledWith('error');
      expect(onMutationFailed).toHaveBeenCalledTimes(1);
      expect(capturedError?.kind).toBe('unknown');

      batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);
      scheduler.run();
      await flushMicrotasks();

      expect(orchestrator.persistDelta).toHaveBeenCalledTimes(2);
      expect(onStatusChange).toHaveBeenLastCalledWith('saved');
    });
  });

  describe('sync status', () => {
    it('emits saving on schedule and saved after a successful flush', async () => {
      const scheduler = new ManualScheduler();
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockResolvedValue(OK),
      };
      const onStatusChange = jest.fn();
      const batcher = createElementPersistenceBatcher({ orchestrator, onStatusChange, scheduler });

      expect(onStatusChange).not.toHaveBeenCalled();

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      expect(onStatusChange).toHaveBeenLastCalledWith('saving');

      scheduler.run();
      await flushMicrotasks();

      expect(onStatusChange).toHaveBeenLastCalledWith('saved');
    });

    it('emits error on failure and returns to saving on the next schedule', async () => {
      const scheduler = new ManualScheduler();
      const error: PersistElementMutationResult = {
        status: 'error',
        error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'Write failed'),
      };
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockResolvedValueOnce(error).mockResolvedValue(OK),
      };
      const onStatusChange = jest.fn();
      const batcher = createElementPersistenceBatcher({ orchestrator, onStatusChange, scheduler });

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      scheduler.run();
      await flushMicrotasks();

      expect(onStatusChange).toHaveBeenLastCalledWith('error');

      batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);
      expect(onStatusChange).toHaveBeenLastCalledWith('saving');

      scheduler.run();
      await flushMicrotasks();

      expect(onStatusChange).toHaveBeenLastCalledWith('saved');
    });

    it('does not emit saved while another mutation is still pending or in flight', async () => {
      const scheduler = new ManualScheduler();
      const first = createDeferred();
      const second = createDeferred();
      const deferreds = [first, second];
      let callIndex = 0;
      const orchestrator: ElementPersistenceOrchestrator = {
        persistDelta: jest.fn().mockImplementation(async () => {
          const deferred = deferreds[callIndex];
          callIndex += 1;
          await deferred?.promise;
          return OK;
        }),
      };
      const onStatusChange = jest.fn();
      const batcher = createElementPersistenceBatcher({ orchestrator, onStatusChange, scheduler });

      batcher.schedule([buildTextElement('el-1', 0)], [buildTextElement('el-1', 10)]);
      scheduler.run();
      await flushMicrotasks();

      batcher.schedule([buildTextElement('el-1', 10)], [buildTextElement('el-1', 20)]);
      expect(onStatusChange).toHaveBeenLastCalledWith('saving');

      first.resolve();
      await flushMicrotasks();
      expect(onStatusChange).not.toHaveBeenCalledWith('saved');

      scheduler.run();
      second.resolve();
      await flushMicrotasks();

      expect(onStatusChange).toHaveBeenLastCalledWith('saved');
    });
  });
});
