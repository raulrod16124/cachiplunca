const STATUS_ORDER = new Map([
  ['TODO', 0],
  ['IN PROGRESS', 1],
  ['BLOCKED', 2],
  ['REVIEW', 3],
  ['DONE', 4],
]);

const PRIORITY_ORDER = new Map([
  ['P0', 0],
  ['P1', 1],
  ['P2', 2],
  ['P3', 3],
]);

const SIZE_ORDER = new Map([
  ['S', 0],
  ['S/M', 1],
  ['M', 1],
  ['M/L', 2],
  ['L', 2],
  ['XL', 3],
]);

const RISK_ORDER = new Map([
  ['Bajo', 0],
  ['Bajo-Medio', 1],
  ['Medio', 1],
  ['Medio-Alto', 2],
  ['Alto', 2],
]);

const TASK_HEADING = /^###\s+((?:[A-Z][A-Z0-9]*-)+\d{3})\s+[—–-]\s+(.+)$/gm;
const TASK_ID = /(?:[A-Z][A-Z0-9]*-)+\d{3}/g;

const REQUIRED_NEW_SECTIONS = [
  'Objetivo',
  'Contexto',
  'Situación actual',
  'Resultado esperado',
  'Alcance',
  'Fuera de alcance',
  'Archivos / componentes afectados',
  'Criterios de aceptación',
  'Tests requeridos',
  'Definition of Ready',
];

export { REQUIRED_NEW_SECTIONS, STATUS_ORDER };

export function clean(value) {
  return value.replace(/`/g, '').replace(/\*\*/g, '').trim();
}

export function normalizeStatus(value) {
  return clean(value).toUpperCase();
}

export function priorityRank(value) {
  return PRIORITY_ORDER.get(clean(value).toUpperCase()) ?? 99;
}

export function sizeRank(value) {
  return SIZE_ORDER.get(clean(value).toUpperCase()) ?? 99;
}

export function riskRank(value) {
  return RISK_ORDER.get(clean(value)) ?? 99;
}

export function field(block, name) {
  const match = block.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? clean(match[1]) : '';
}

export function documentField(text, name) {
  const match = text.match(new RegExp(`^>\\s*\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? clean(match[1]) : '';
}

export function hasOpenQuestions(block) {
  const marker = '#### Preguntas abiertas';
  const index = block.indexOf(marker);
  if (index === -1) {
    return false;
  }
  const content = block
    .slice(index + marker.length)
    .split(/\n---\s*\n/)[0]
    .split(/\n##\s/)[0]
    .trim();
  if (content === '') {
    return false;
  }
  return !/^[-*]\s*ninguna\.?$/i.test(content) && !/^ninguna\.?$/i.test(content);
}

export function parseDependencies(value) {
  return [...new Set(value.match(TASK_ID) ?? [])];
}

export function parseTasks(text, document) {
  const tasks = [];
  const matches = [...text.matchAll(TASK_HEADING)];
  for (const [index, match] of matches.entries()) {
    const id = match[1];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const block = text.slice(start, end);
    tasks.push({
      id,
      title: clean(match[2]),
      status: normalizeStatus(field(block, 'Estado')),
      priority: field(block, 'Prioridad'),
      size: field(block, 'Tamaño'),
      risk: field(block, 'Riesgo'),
      dependencies: parseDependencies(field(block, 'Dependencias')),
      openQuestions: hasOpenQuestions(block),
      block,
      document,
      line: text.slice(0, start).split('\n').length,
      order: tasks.length,
    });
  }
  return tasks;
}

export function parseIndex(text) {
  const documents = [];
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) {
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => clean(cell));
    if (!/^\d+$/.test(cells[0] ?? '')) {
      continue;
    }
    const [order, phase, file, prefix, status, completion, updated] = cells;
    documents.push({
      order: Number(order),
      phase,
      file,
      prefix,
      status: normalizeStatus(status),
      completion: normalizeStatus(completion),
      updated,
      fromIndex: true,
    });
  }
  return documents;
}

export function activeOrder(documents) {
  const active = documents.filter((document) => document.status !== 'DONE');
  if (active.length === 0) {
    return null;
  }
  return active.reduce((max, document) => Math.max(max, document.order), -Infinity);
}

export function blockersFor(task, byId) {
  return task.dependencies.filter((dependency) => byId.get(dependency)?.status !== 'DONE');
}

export function isEligible(task, byId) {
  return task.status === 'TODO' && blockersFor(task, byId).length === 0 && !task.openQuestions;
}

export function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    return (
      left.document.order - right.document.order ||
      priorityRank(left.priority) - priorityRank(right.priority) ||
      left.order - right.order ||
      sizeRank(left.size) - sizeRank(right.size) ||
      riskRank(left.risk) - riskRank(right.risk) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function selectNextTasks(tasks, byId, options = {}) {
  const { activeOnly = true, order = null } = options;
  const eligible = tasks.filter(
    (task) =>
      isEligible(task, byId) && (!activeOnly || order === null || task.document.order === order),
  );
  return sortTasks(eligible);
}

export function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

export function branchName(task) {
  return `feat/${task.id.toLowerCase()}-${slugify(task.title)}`;
}

export function detectCycle(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      return [...stack.slice(start), id];
    }
    if (visited.has(id)) {
      return null;
    }
    const task = byId.get(id);
    if (!task) {
      return null;
    }
    visiting.add(id);
    stack.push(id);
    for (const dependency of task.dependencies) {
      const cycle = visit(dependency);
      if (cycle) {
        return cycle;
      }
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  for (const task of tasks) {
    const cycle = visit(task.id);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

export function missingSections(block) {
  return REQUIRED_NEW_SECTIONS.filter(
    (section) => !block.includes(`#### ${section}`) && !block.includes(`#### ${section}\n`),
  );
}
