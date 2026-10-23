export interface MockRef {
  readonly kind: 'root' | 'collection' | 'doc';
  readonly path: string;
  readonly id: string;
}

export interface MockDocumentSnapshot {
  readonly id: string;
  exists(): boolean;
  data(): Record<string, unknown> | undefined;
}

export interface MockQuerySnapshot {
  readonly docs: readonly MockDocumentSnapshot[];
}

export type MockRealtimeChangeType = 'added' | 'modified' | 'removed';

export interface MockRealtimeChangeInput {
  readonly type: MockRealtimeChangeType;
  readonly id: string;
  readonly data?: unknown;
  readonly hasPendingWrites?: boolean;
}

export interface MockRealtimeDocument {
  readonly id: string;
  readonly metadata: { readonly hasPendingWrites: boolean };
  data(): Record<string, unknown> | undefined;
}

export interface MockRealtimeDocumentChange {
  readonly type: MockRealtimeChangeType;
  readonly doc: MockRealtimeDocument;
}

export interface MockRealtimeSnapshot {
  readonly docs: readonly MockRealtimeDocument[];
  readonly metadata: { readonly fromCache: boolean };
  docChanges(): readonly MockRealtimeDocumentChange[];
}

export interface MockConstraint {
  readonly kind: 'where';
  readonly field: string;
  readonly op: '==';
  readonly value: unknown;
}

export interface MockOrderConstraint {
  readonly kind: 'orderBy';
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export interface MockLimitConstraint {
  readonly kind: 'limit';
  readonly value: number;
}

export type MockQueryConstraint = MockConstraint | MockOrderConstraint | MockLimitConstraint;

export interface MockQuery {
  readonly kind: 'query';
  readonly ref: MockRef;
  readonly constraints: readonly MockQueryConstraint[];
}

export interface MockWriteBatch {
  set(ref: MockRef, data: Record<string, unknown>): MockWriteBatch;
  delete(ref: MockRef): MockWriteBatch;
  commit(): Promise<void>;
}

export interface InMemoryFirestoreApi {
  collection(db: unknown, ...segments: string[]): MockRef;
  doc(ref: MockRef, ...segments: string[]): MockRef;
  getDoc(ref: MockRef): Promise<MockDocumentSnapshot>;
  getDocs(ref: MockRef | MockQuery): Promise<MockQuerySnapshot>;
  setDoc(ref: MockRef, data: Record<string, unknown>): Promise<void>;
  updateDoc(ref: MockRef, data: Record<string, unknown>): Promise<void>;
  deleteDoc(ref: MockRef): Promise<void>;
  writeBatch(db: unknown): MockWriteBatch;
  query(ref: MockRef, ...constraints: MockQueryConstraint[]): MockQuery;
  where(field: string, op: '==', value: unknown): MockConstraint;
  orderBy(field: string, direction?: 'asc' | 'desc'): MockOrderConstraint;
  limit(value: number): MockLimitConstraint;
  onSnapshot(
    ref: MockRef | MockQuery,
    optionsOrNext:
      { readonly includeMetadataChanges?: boolean } | ((snapshot: MockRealtimeSnapshot) => void),
    onNextOrError?: ((snapshot: MockRealtimeSnapshot) => void) | ((error: unknown) => void),
    onError?: (error: unknown) => void,
  ): () => void;
  __reset(): void;
  __seed(path: string, data: object): void;
  __failNextWith(code: string): void;
  __setInitialSnapshotFromCache(fromCache: boolean): void;
  __read(path: string): Record<string, unknown> | undefined;
  __paths(): string[];
  __emitSnapshot(
    workspaceId: string,
    changes: readonly MockRealtimeChangeInput[],
    options?: { readonly fromCache?: boolean },
  ): void;
  __emitError(workspaceId: string, error: unknown): void;
  __activeSnapshotListenerCount(workspaceId?: string): number;
}

interface SnapshotListener {
  readonly ref: MockRef;
  readonly constraints: readonly MockQueryConstraint[];
  readonly onNext: (snapshot: MockRealtimeSnapshot) => void;
  readonly onError: (error: unknown) => void;
}

export function createInMemoryFirestoreModule(): InMemoryFirestoreApi {
  const store = new Map<string, Record<string, unknown>>();
  let sequence = 0;
  let pendingFailureCode: string | null = null;
  let initialSnapshotFromCache = false;
  const snapshotListeners = new Set<SnapshotListener>();

  function maybeFail(): void {
    if (pendingFailureCode === null) {
      return;
    }
    const code = pendingFailureCode;
    pendingFailureCode = null;
    throw Object.assign(new Error(`Firebase: Error (${code}).`), { code });
  }

  function lastSegment(path: string): string {
    const segments = path.split('/');
    return segments[segments.length - 1] ?? '';
  }

  function generateId(): string {
    sequence += 1;
    return `doc${String(sequence).padStart(17, '0')}`;
  }

  function makeSnapshot(id: string, path: string): MockDocumentSnapshot {
    return {
      id,
      exists: () => store.has(path),
      data: () => {
        const data = store.get(path);
        return data === undefined ? undefined : { ...data };
      },
    };
  }

  function requireDoc(path: string): Record<string, unknown> {
    const data = store.get(path);
    if (data === undefined) {
      throw Object.assign(new Error('No document to update'), { code: 'not-found' });
    }
    return data;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function readField(data: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (!isRecord(current)) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  function matchesConstraints(
    data: Record<string, unknown>,
    constraints: readonly MockQueryConstraint[],
  ): boolean {
    for (const constraint of constraints) {
      if (
        constraint.kind === 'where' &&
        constraint.op === '==' &&
        readField(data, constraint.field) !== constraint.value
      ) {
        return false;
      }
    }
    return true;
  }

  function comparable(value: unknown): number | string | null {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    return null;
  }

  function collectDocuments(
    baseRef: MockRef,
    constraints: readonly MockQueryConstraint[],
  ): { readonly id: string; readonly path: string; readonly data: Record<string, unknown> }[] {
    const prefix = `${baseRef.path}/`;
    const order = constraints.find(
      (constraint): constraint is MockOrderConstraint => constraint.kind === 'orderBy',
    );
    const limitConstraint = constraints.find(
      (constraint): constraint is MockLimitConstraint => constraint.kind === 'limit',
    );
    let documents = [...store.keys()]
      .filter((path) => path.startsWith(prefix))
      .map((path) => ({ id: lastSegment(path), path, data: store.get(path) }))
      .filter(
        (entry): entry is { id: string; path: string; data: Record<string, unknown> } =>
          entry.data !== undefined && matchesConstraints(entry.data, constraints),
      );

    if (order !== undefined) {
      const direction = order.direction === 'desc' ? -1 : 1;
      documents = documents.sort((left, right) => {
        const leftValue = comparable(readField(left.data, order.field));
        const rightValue = comparable(readField(right.data, order.field));
        if (leftValue === rightValue) {
          return 0;
        }
        if (leftValue === null) {
          return -1 * direction;
        }
        if (rightValue === null) {
          return 1 * direction;
        }
        return leftValue < rightValue ? -1 * direction : 1 * direction;
      });
    }

    if (limitConstraint !== undefined) {
      documents = documents.slice(0, limitConstraint.value);
    }

    return documents;
  }

  function makeRealtimeDocument(
    id: string,
    data: unknown,
    hasPendingWrites: boolean,
  ): MockRealtimeDocument {
    return {
      id,
      metadata: { hasPendingWrites },
      data: () => (data === undefined ? undefined : { ...(data as Record<string, unknown>) }),
    };
  }

  function makeRealtimeSnapshot(
    changes: readonly MockRealtimeDocumentChange[],
    fromCache = false,
  ): MockRealtimeSnapshot {
    return {
      docs: changes.filter((change) => change.type !== 'removed').map((change) => change.doc),
      metadata: { fromCache },
      docChanges: () => changes,
    };
  }

  function buildInitialSnapshot(
    baseRef: MockRef,
    constraints: readonly MockQueryConstraint[],
    fromCache: boolean,
  ): MockRealtimeSnapshot {
    const changes: MockRealtimeDocumentChange[] = collectDocuments(baseRef, constraints).map(
      (entry) => ({
        type: 'added',
        doc: makeRealtimeDocument(entry.id, entry.data, false),
      }),
    );
    return makeRealtimeSnapshot(changes, fromCache);
  }

  function buildEmittedSnapshot(
    changes: readonly MockRealtimeChangeInput[],
    fromCache: boolean,
  ): MockRealtimeSnapshot {
    return makeRealtimeSnapshot(
      changes.map((change) => ({
        type: change.type,
        doc: makeRealtimeDocument(change.id, change.data, change.hasPendingWrites ?? false),
      })),
      fromCache,
    );
  }

  function forEachMatchingListener(
    workspaceId: string,
    visit: (listener: SnapshotListener) => void,
  ): void {
    for (const listener of snapshotListeners) {
      if (matchesConstraints({ workspaceId }, listener.constraints)) {
        visit(listener);
      }
    }
  }

  return {
    collection(_db: unknown, ...segments: string[]): MockRef {
      const path = segments.join('/');
      return { kind: 'collection', path, id: lastSegment(path) };
    },

    doc(ref: MockRef, ...segments: string[]): MockRef {
      if (ref.kind === 'collection') {
        const id = segments[0] ?? generateId();
        return { kind: 'doc', id, path: `${ref.path}/${id}` };
      }
      const path = segments.join('/');
      return { kind: 'doc', id: lastSegment(path), path };
    },

    async getDoc(ref: MockRef): Promise<MockDocumentSnapshot> {
      maybeFail();
      return makeSnapshot(ref.id, ref.path);
    },

    async getDocs(ref: MockRef | MockQuery): Promise<MockQuerySnapshot> {
      maybeFail();
      const baseRef = ref.kind === 'query' ? ref.ref : ref;
      const constraints = ref.kind === 'query' ? ref.constraints : [];
      const docs = collectDocuments(baseRef, constraints).map((entry) =>
        makeSnapshot(entry.id, entry.path),
      );
      return { docs };
    },

    async setDoc(ref: MockRef, data: Record<string, unknown>): Promise<void> {
      maybeFail();
      store.set(ref.path, { ...data });
    },

    async updateDoc(ref: MockRef, data: Record<string, unknown>): Promise<void> {
      maybeFail();
      store.set(ref.path, { ...requireDoc(ref.path), ...data });
    },

    async deleteDoc(ref: MockRef): Promise<void> {
      maybeFail();
      store.delete(ref.path);
    },

    writeBatch(_db: unknown): MockWriteBatch {
      const operations: (() => void)[] = [];

      const batch: MockWriteBatch = {
        set(ref: MockRef, data: Record<string, unknown>): MockWriteBatch {
          operations.push(() => {
            store.set(ref.path, { ...data });
          });
          return batch;
        },
        delete(ref: MockRef): MockWriteBatch {
          operations.push(() => {
            store.delete(ref.path);
          });
          return batch;
        },
        async commit(): Promise<void> {
          maybeFail();
          for (const operation of operations) {
            operation();
          }
        },
      };

      return batch;
    },

    query(ref: MockRef, ...constraints: MockQueryConstraint[]): MockQuery {
      return { kind: 'query', ref, constraints };
    },

    where(field: string, op: '==', value: unknown): MockConstraint {
      return { kind: 'where', field, op, value };
    },

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): MockOrderConstraint {
      return { kind: 'orderBy', field, direction };
    },

    limit(value: number): MockLimitConstraint {
      return { kind: 'limit', value };
    },

    onSnapshot(
      ref: MockRef | MockQuery,
      optionsOrNext:
        { readonly includeMetadataChanges?: boolean } | ((snapshot: MockRealtimeSnapshot) => void),
      onNextOrError?: ((snapshot: MockRealtimeSnapshot) => void) | ((error: unknown) => void),
      onError?: (error: unknown) => void,
    ): () => void {
      const onNext =
        typeof optionsOrNext === 'function'
          ? optionsOrNext
          : (onNextOrError as (snapshot: MockRealtimeSnapshot) => void);
      const errorListener =
        typeof optionsOrNext === 'function'
          ? (onNextOrError as ((error: unknown) => void) | undefined)
          : onError;
      const baseRef = ref.kind === 'query' ? ref.ref : ref;
      const constraints = ref.kind === 'query' ? ref.constraints : [];
      const listener: SnapshotListener = {
        ref: baseRef,
        constraints,
        onNext,
        onError: errorListener ?? (() => undefined),
      };
      snapshotListeners.add(listener);
      onNext(buildInitialSnapshot(baseRef, constraints, initialSnapshotFromCache));

      let active = true;
      return () => {
        if (!active) {
          return;
        }
        active = false;
        snapshotListeners.delete(listener);
      };
    },

    __reset(): void {
      store.clear();
      sequence = 0;
      pendingFailureCode = null;
      initialSnapshotFromCache = false;
      snapshotListeners.clear();
    },

    __seed(path: string, data: object): void {
      store.set(path, { ...(data as Record<string, unknown>) });
    },

    __failNextWith(code: string): void {
      pendingFailureCode = code;
    },

    __setInitialSnapshotFromCache(fromCache: boolean): void {
      initialSnapshotFromCache = fromCache;
    },

    __read(path: string): Record<string, unknown> | undefined {
      const data = store.get(path);
      return data === undefined ? undefined : { ...data };
    },

    __paths(): string[] {
      return [...store.keys()];
    },

    __emitSnapshot(
      workspaceId: string,
      changes: readonly MockRealtimeChangeInput[],
      options?: { readonly fromCache?: boolean },
    ): void {
      const fromCache = options?.fromCache ?? false;
      forEachMatchingListener(workspaceId, (listener) => {
        listener.onNext(buildEmittedSnapshot(changes, fromCache));
      });
    },

    __emitError(workspaceId: string, error: unknown): void {
      forEachMatchingListener(workspaceId, (listener) => {
        listener.onError(error);
      });
    },

    __activeSnapshotListenerCount(workspaceId?: string): number {
      let count = 0;
      for (const listener of snapshotListeners) {
        if (
          workspaceId === undefined ||
          matchesConstraints({ workspaceId }, listener.constraints)
        ) {
          count += 1;
        }
      }
      return count;
    },
  };
}
