#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JIRA_DIR = path.join(ROOT, 'docs/jiras');
const INDEX_FILE = path.join(JIRA_DIR, 'INDEX.md');

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

function clean(value) {
  return value.replace(/`/g, '').replace(/\*\*/g, '').trim();
}

function normalizeStatus(value) {
  return clean(value).toUpperCase();
}

function relativeToRoot(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function priorityRank(value) {
  return PRIORITY_ORDER.get(clean(value).toUpperCase()) ?? 99;
}

function sizeRank(value) {
  return SIZE_ORDER.get(clean(value).toUpperCase()) ?? 99;
}

function riskRank(value) {
  return RISK_ORDER.get(clean(value)) ?? 99;
}

function field(block, name) {
  const match = block.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? clean(match[1]) : '';
}

function documentField(text, name) {
  const match = text.match(new RegExp(`^>\\s*\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? clean(match[1]) : '';
}

function hasOpenQuestions(block) {
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

function parseDependencies(value) {
  return [...new Set(value.match(TASK_ID) ?? [])];
}

function parseTasks(text, document) {
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

async function readIndex() {
  try {
    const text = await readFile(INDEX_FILE, 'utf8');
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
        file: path.resolve(JIRA_DIR, file),
        prefix,
        status: normalizeStatus(status),
        completion: normalizeStatus(completion),
        updated,
        fromIndex: true,
      });
    }
    return documents;
  } catch {
    return [];
  }
}

async function discoverDocuments() {
  const documents = [];
  try {
    const entries = await readdir(JIRA_DIR);
    for (const entry of entries) {
      if (!entry.endsWith('.md') || entry === 'INDEX.md' || entry === 'METRICS.md') {
        continue;
      }
      documents.push({
        order: documents.length + 1,
        phase: entry,
        file: path.join(JIRA_DIR, entry),
        prefix: '',
        status: '',
        completion: 'DONE',
        updated: '',
        fromIndex: false,
      });
    }
  } catch {
    // The local JIRA directory may not exist yet.
  }

  try {
    const entries = await readdir(path.join(ROOT, 'docs'));
    for (const entry of entries) {
      if (!/^CACHIPLUNCA_.*_JIRA\.md$/.test(entry)) {
        continue;
      }
      documents.push({
        order: documents.length + 1,
        phase: entry,
        file: path.join(ROOT, 'docs', entry),
        prefix: '',
        status: '',
        completion: 'DONE',
        updated: '',
        fromIndex: false,
      });
    }
  } catch {
    // Ignore missing docs directory.
  }

  return documents;
}

async function loadAllTasks() {
  const indexed = await readIndex();
  const documents = indexed.length > 0 ? indexed : await discoverDocuments();
  const tasks = [];
  const missingDocuments = [];

  for (const document of documents) {
    try {
      const text = await readFile(document.file, 'utf8');
      document.globalStatus = normalizeStatus(documentField(text, 'Estado global'));
      tasks.push(...parseTasks(text, document));
    } catch {
      missingDocuments.push(document.file);
    }
  }

  return { tasks, documents, missingDocuments };
}

function sortTasks(tasks) {
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

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

function branchName(task) {
  return `feat/${task.id.toLowerCase()}-${slugify(task.title)}`;
}

function printTable(tasks) {
  const headers = ['ID', 'Estado', 'Prioridad', 'Documento', 'Título'];
  const rows = sortTasks(tasks).map((task) => [
    task.id,
    task.status,
    task.priority,
    relativeToRoot(task.document.file),
    task.title,
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(format(row));
  }
}

function blockersFor(task, byId) {
  return task.dependencies.filter((dependency) => byId.get(dependency)?.status !== 'DONE');
}

function printTask(task, byId) {
  const missing = blockersFor(task, byId);
  console.log(`JIRA: ${relativeToRoot(task.document.file)}`);
  console.log(`Tarea: ${task.id} — ${task.title}`);
  console.log(`Estado: ${task.status}`);
  console.log(`Prioridad: ${task.priority || '—'}`);
  console.log(`Tamaño: ${task.size || '—'}  Riesgo: ${task.risk || '—'}`);
  console.log(`Dependencias: ${task.dependencies.join(', ') || 'Ninguna'}`);
  console.log(`Dependencias pendientes: ${missing.join(', ') || 'Ninguna'}`);
  console.log(`Rama: ${branchName(task)}`);
  if (task.openQuestions) {
    console.log('Preguntas abiertas: sí (revisar la ficha antes de empezar)');
  }
}

async function commandList(args) {
  const { tasks, missingDocuments } = await loadAllTasks();
  const status = args[0] ? normalizeStatus(args[0]) : '';
  const filtered = status ? tasks.filter((task) => task.status === status) : tasks;
  printTable(filtered);
  if (missingDocuments.length > 0) {
    console.log(`\nDocumentos no encontrados: ${missingDocuments.map(relativeToRoot).join(', ')}`);
  }
}

async function commandNext(args) {
  const { tasks, missingDocuments } = await loadAllTasks();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const eligible = sortTasks(
    tasks.filter(
      (task) =>
        task.status === 'TODO' && blockersFor(task, byId).length === 0 && !task.openQuestions,
    ),
  );

  if (args.includes('--json')) {
    const task = eligible[0];
    console.log(
      JSON.stringify(
        task
          ? {
              id: task.id,
              title: task.title,
              document: relativeToRoot(task.document.file),
              priority: task.priority,
              dependencies: task.dependencies,
              branch: branchName(task),
            }
          : { task: null, missingDocuments },
        null,
        2,
      ),
    );
    return task ? 0 : 1;
  }

  if (eligible.length === 0) {
    console.log('No hay tareas TODO elegibles.');
    const blocked = tasks.filter((task) => task.status === 'BLOCKED');
    const review = tasks.filter((task) => task.status === 'REVIEW');
    if (blocked.length > 0) {
      console.log(`Bloqueadas: ${blocked.map((task) => task.id).join(', ')}`);
    }
    if (review.length > 0) {
      console.log(`En REVIEW: ${review.map((task) => task.id).join(', ')}`);
    }
    if (missingDocuments.length > 0) {
      console.log(`Documentos no encontrados: ${missingDocuments.map(relativeToRoot).join(', ')}`);
    }
    return 1;
  }

  if (eligible.length > 1) {
    const sameRank = eligible.filter(
      (task) =>
        task.document.order === eligible[0].document.order &&
        priorityRank(task.priority) === priorityRank(eligible[0].priority),
    );
    if (sameRank.length > 1) {
      console.log('Hay varias tareas igual de elegibles:');
      for (const task of sameRank) {
        console.log(`- ${task.id}: ${task.title}`);
      }
      console.log('\nSeleccionada la primera por orden del documento.\n');
    }
  }

  printTask(eligible[0], byId);
  return 0;
}

function detectCycle(tasks) {
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

function missingSections(block) {
  return REQUIRED_NEW_SECTIONS.filter(
    (section) => !block.includes(`#### ${section}`) && !block.includes(`#### ${section}\n`),
  );
}

async function commandValidate() {
  const { tasks, documents, missingDocuments } = await loadAllTasks();
  const errors = [];
  const warnings = [];
  const ids = new Map();

  for (const file of missingDocuments) {
    errors.push(`Documento no encontrado: ${relativeToRoot(file)}`);
  }

  if (tasks.length === 0) {
    errors.push('No se han encontrado tareas JIRA.');
  }

  for (const task of tasks) {
    if (ids.has(task.id)) {
      errors.push(`ID duplicado: ${task.id} en ${relativeToRoot(task.document.file)}`);
    }
    ids.set(task.id, task);
    if (!STATUS_ORDER.has(task.status)) {
      errors.push(`${task.id}: estado inválido "${task.status}"`);
    }
    if (!task.priority) {
      warnings.push(`${task.id}: falta Prioridad`);
    }
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!byId.has(dependency)) {
        errors.push(`${task.id}: dependencia inexistente ${dependency}`);
      }
    }
  }

  const cycle = detectCycle(tasks);
  if (cycle) {
    errors.push(`Ciclo de dependencias: ${cycle.join(' → ')}`);
  }

  for (const document of documents) {
    if (document.file.endsWith('.md') && !document.fromIndex) {
      continue;
    }
    const documentTasks = tasks.filter((task) => task.document.file === document.file);
    if (document.globalStatus === 'DONE' && documentTasks.some((task) => task.status !== 'DONE')) {
      errors.push(
        `${relativeToRoot(document.file)}: estado global DONE con tareas no DONE (${documentTasks
          .filter((task) => task.status !== 'DONE')
          .map((task) => `${task.id}=${task.status}`)
          .join(', ')})`,
      );
    }
  }

  for (const task of tasks) {
    const isNewDocument = task.document.file.startsWith(JIRA_DIR + path.sep);
    if (!isNewDocument) {
      continue;
    }
    const missing = missingSections(task.block);
    if (missing.length > 0) {
      errors.push(`${task.id}: faltan secciones (${missing.join(', ')})`);
    }
    if (task.openQuestions) {
      warnings.push(`${task.id}: tiene preguntas abiertas`);
    }
  }

  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }
  for (const error of errors) {
    console.log(`error: ${error}`);
  }

  if (errors.length === 0) {
    console.log(`OK: ${tasks.length} tareas en ${documents.length} documentos, sin errores.`);
    return 0;
  }
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
  return 1;
}

function printHelp() {
  console.log(`Uso: node scripts/jira.mjs <comando> [opciones]

Comandos:
  list [ESTADO]   Lista tareas (opcionalmente filtradas por estado).
  next [--json]   Muestra la siguiente tarea TODO elegible.
  validate        Valida IDs, estados, dependencias, ciclos y fichas nuevas.
`);
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  try {
    if (command === 'list') {
      await commandList(args);
      return 0;
    }
    if (command === 'next') {
      return await commandNext(args);
    }
    if (command === 'validate') {
      return await commandValidate();
    }
    if (command === 'help' || command === '--help' || command === '-h') {
      printHelp();
      return 0;
    }
    console.error(`Comando desconocido: ${command}`);
    printHelp();
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await main();
