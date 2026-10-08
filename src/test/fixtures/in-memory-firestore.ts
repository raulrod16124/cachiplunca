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

export interface InMemoryFirestoreApi {
  collection(db: unknown, ...segments: string[]): MockRef;
  doc(ref: MockRef, ...segments: string[]): MockRef;
  getDoc(ref: MockRef): Promise<MockDocumentSnapshot>;
  getDocs(ref: MockRef): Promise<MockQuerySnapshot>;
  setDoc(ref: MockRef, data: Record<string, unknown>): Promise<void>;
  updateDoc(ref: MockRef, data: Record<string, unknown>): Promise<void>;
  deleteDoc(ref: MockRef): Promise<void>;
  __reset(): void;
  __seed(path: string, data: Record<string, unknown>): void;
  __failNextWith(code: string): void;
  __read(path: string): Record<string, unknown> | undefined;
  __paths(): string[];
}

export function createInMemoryFirestoreModule(): InMemoryFirestoreApi {
  const store = new Map<string, Record<string, unknown>>();
  let sequence = 0;
  let pendingFailureCode: string | null = null;

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

    async getDocs(ref: MockRef): Promise<MockQuerySnapshot> {
      maybeFail();
      const prefix = `${ref.path}/`;
      const docs: MockDocumentSnapshot[] = [];
      for (const path of store.keys()) {
        if (path.startsWith(prefix)) {
          docs.push(makeSnapshot(lastSegment(path), path));
        }
      }
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

    __reset(): void {
      store.clear();
      sequence = 0;
      pendingFailureCode = null;
    },

    __seed(path: string, data: Record<string, unknown>): void {
      store.set(path, { ...data });
    },

    __failNextWith(code: string): void {
      pendingFailureCode = code;
    },

    __read(path: string): Record<string, unknown> | undefined {
      const data = store.get(path);
      return data === undefined ? undefined : { ...data };
    },

    __paths(): string[] {
      return [...store.keys()];
    },
  };
}
