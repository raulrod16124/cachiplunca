#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STATUS_ORDER,
  activeOrder,
  blockersFor,
  branchName,
  detectCycle,
  documentField,
  missingSections,
  normalizeStatus,
  parseIndex,
  parseTasks,
  priorityRank,
  selectNextTasks,
  sortTasks,
} from './jira-selector.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JIRA_DIR = path.join(ROOT, 'docs/jiras');
const INDEX_FILE = path.join(JIRA_DIR, 'INDEX.md');

function relativeToRoot(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

async function readIndex() {
  try {
    const text = await readFile(INDEX_FILE, 'utf8');
    return parseIndex(text).map((document) => ({
      ...document,
      file: path.resolve(JIRA_DIR, document.file),
    }));
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

function printTask(task, byId) {
  const missing = blockersFor(task, byId);
  console.log(`JIRA: ${relativeToRoot(task.document.file)}`);
  console.log(`Fase: ${task.document.phase || '—'} (orden ${task.document.order})`);
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

function printSelectionScope(documents, order, all) {
  if (all) {
    console.log('Alcance: todas las fases (--all).');
    return;
  }
  const document = documents.find((candidate) => candidate.order === order);
  if (document === undefined) {
    console.log('Alcance: todas las fases (sin índice de fases).');
    return;
  }
  console.log(`Fase activa: ${document.phase} (orden ${document.order}).`);
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
  const { tasks, documents, missingDocuments } = await loadAllTasks();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const all = args.includes('--all');
  const usingIndex = documents.some((document) => document.fromIndex);
  const order = usingIndex && !all ? activeOrder(documents) : null;
  const activeOnly = usingIndex && !all && order !== null;
  const eligible = selectNextTasks(tasks, byId, { activeOnly, order });

  if (args.includes('--json')) {
    const task = eligible[0];
    const document = documents.find((candidate) => candidate.order === order);
    console.log(
      JSON.stringify(
        task
          ? {
              id: task.id,
              title: task.title,
              document: relativeToRoot(task.document.file),
              phase: task.document.phase,
              activePhase: document?.phase ?? null,
              priority: task.priority,
              dependencies: task.dependencies,
              branch: branchName(task),
            }
          : { task: null, activePhase: document?.phase ?? null, missingDocuments },
        null,
        2,
      ),
    );
    return task ? 0 : 1;
  }

  if (eligible.length === 0) {
    printSelectionScope(documents, order, all || !usingIndex);
    console.log('No hay tareas TODO elegibles.');
    const blocked = tasks.filter((task) => task.status === 'BLOCKED');
    const review = tasks.filter((task) => task.status === 'REVIEW');
    if (blocked.length > 0) {
      console.log(`Bloqueadas: ${blocked.map((task) => task.id).join(', ')}`);
    }
    if (review.length > 0) {
      console.log(`En REVIEW: ${review.map((task) => task.id).join(', ')}`);
    }
    if (activeOnly) {
      console.log('Usa --all para buscar en el resto de fases.');
    }
    if (missingDocuments.length > 0) {
      console.log(`Documentos no encontrados: ${missingDocuments.map(relativeToRoot).join(', ')}`);
    }
    return 1;
  }

  printSelectionScope(documents, order, all || !usingIndex);

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

function printCard(task) {
  console.log(task.block.trimEnd());
}

async function commandCard(args) {
  const id = args[0];
  if (!id) {
    console.log('Uso: node scripts/jira.mjs card <ID>');
    return 1;
  }
  const { tasks } = await loadAllTasks();
  const task = tasks.find((candidate) => candidate.id === id);
  if (!task) {
    console.log(`Tarea no encontrada: ${id}`);
    return 1;
  }
  console.log(`JIRA: ${relativeToRoot(task.document.file)}\n`);
  printCard(task);
  return 0;
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
  next [--all]    Muestra la siguiente tarea TODO elegible de la fase activa.
                  Con --all busca en todas las fases.
  card <ID>       Muestra la ficha completa de una tarea.
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
    if (command === 'card') {
      return await commandCard(args);
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
