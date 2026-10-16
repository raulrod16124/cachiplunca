import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import {
  ELEMENT_TYPES,
  TASK_STATUSES,
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
} from '../../domain/element';
import type { Element, ElementType } from '../../domain/element';

const DEFAULT_SEED = 0x9e3779b9;
const COLUMN_SPACING = 260;
const ROW_SPACING = 220;
const JITTER = 16;
const MIN_ELEMENTS_FOR_CONNECTORS = 3;
const BASE_TIMESTAMP = Date.UTC(2026, 0, 1, 0, 0, 0);

const NON_CONNECTOR_TYPES = ELEMENT_TYPES.filter((type) => type !== 'connector');

const ELEMENT_SIZES: Record<ElementType, Size> = {
  text: Size.create(160, 40),
  note: Size.create(200, 160),
  task: Size.create(220, 120),
  frame: Size.create(320, 240),
  connector: Size.create(0, 0),
  link: Size.create(220, 64),
};

export interface GenerateElementsOptions {
  readonly count: number;
  readonly seed?: number;
  readonly workspaceId?: WorkspaceId;
  readonly createdBy?: UserId;
}

/**
 * Deterministic 32-bit PRNG (mulberry32). Same seed ⇒ same element layout, so
 * performance numbers are comparable across runs and machines.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickType(index: number, count: number): ElementType {
  if (count < MIN_ELEMENTS_FOR_CONNECTORS) {
    return NON_CONNECTOR_TYPES[index % NON_CONNECTOR_TYPES.length] ?? 'text';
  }

  return ELEMENT_TYPES[index % ELEMENT_TYPES.length] ?? 'text';
}

/**
 * Builds a deterministic board mixing every element type, spread over a grid so
 * that bounds/selection work is realistic. Connectors reference other generated
 * elements. Used by the performance baselines and available to any fixture that
 * needs a large, reproducible board.
 */
export function generateElements(options: GenerateElementsOptions): readonly Element[] {
  const { count } = options;

  if (!Number.isInteger(count) || count < 0) {
    throw new Error('generateElements count must be a non-negative integer');
  }

  if (count === 0) {
    return [];
  }

  const random = createRandom(options.seed ?? DEFAULT_SEED);
  const workspaceId = options.workspaceId ?? WorkspaceId.create('perf-workspace');
  const createdBy = options.createdBy ?? UserId.create('perf-user');
  const ids = Array.from({ length: count }, (_, index) => ElementId.create(`perf-el-${index}`));
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const timestamp = new Date(BASE_TIMESTAMP);

  return ids.map((id, index) => {
    const type = pickType(index, count);
    const position = Position.create(
      (index % columns) * COLUMN_SPACING + Math.floor(random() * JITTER),
      Math.floor(index / columns) * ROW_SPACING + Math.floor(random() * JITTER),
    );
    const base = {
      id,
      workspaceId,
      createdBy,
      position,
      size: ELEMENT_SIZES[type],
      rotation: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    switch (type) {
      case 'text':
        return createTextElement({ ...base, content: `Text element ${index}` });
      case 'note':
        return createNoteElement({ ...base, content: `Note element ${index}` });
      case 'task':
        return createTaskElement({
          ...base,
          title: `Task ${index}`,
          status: TASK_STATUSES[index % TASK_STATUSES.length] ?? 'todo',
        });
      case 'frame':
        return createFrameElement({ ...base, title: `Frame ${index}` });
      case 'link':
        return createLinkElement({ ...base, url: `https://example.com/${index}` });
      case 'connector':
        return createConnectorElement({
          ...base,
          sourceElementId: ids[(index + 1) % count] ?? id,
          targetElementId: ids[(index + 2) % count] ?? id,
        });
      default: {
        const unknown: never = type;
        throw new Error(`Unsupported element type: ${JSON.stringify(unknown)}`);
      }
    }
  });
}
