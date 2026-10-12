import type { CancelScheduledFlush, Scheduler } from '../../application/services';

export class ManualScheduler implements Scheduler {
  #tasks = new Map<number, () => void>();
  #nextId = 0;

  schedule(callback: () => void): CancelScheduledFlush {
    const id = (this.#nextId += 1);
    this.#tasks.set(id, callback);

    return () => {
      this.#tasks.delete(id);
    };
  }

  get pending(): number {
    return this.#tasks.size;
  }

  run(): void {
    const tasks = [...this.#tasks.values()];
    this.#tasks.clear();

    for (const task of tasks) {
      task();
    }
  }
}

export function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
