import type { Element } from '../../domain/element';

export function compareElementVersions(a: Element, b: Element): -1 | 0 | 1 {
  const aTime = a.updatedAt.getTime();
  const bTime = b.updatedAt.getTime();

  if (aTime > bTime) {
    return 1;
  }

  if (aTime < bTime) {
    return -1;
  }

  return 0;
}

export function isStrictlyNewer(incoming: Element, existing: Element): boolean {
  return compareElementVersions(incoming, existing) === 1;
}

export function resolveElementVersion(a: Element, b: Element): Element {
  if (a.id.value !== b.id.value) {
    throw new Error('resolveElementVersion requires elements with the same id');
  }

  const order = compareElementVersions(a, b);

  if (order === 1) {
    return a;
  }

  if (order === -1) {
    return b;
  }

  const canonicalA = canonicalizeElement(a);
  const canonicalB = canonicalizeElement(b);

  if (canonicalA === canonicalB) {
    return a;
  }

  return canonicalA > canonicalB ? a : b;
}

export function canonicalizeElement(element: Element): string {
  return JSON.stringify(canonicalize(element));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(record).sort()) {
    result[key] = canonicalize(record[key]);
  }

  return result;
}
