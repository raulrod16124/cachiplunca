import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activeOrder,
  branchName,
  hasOpenQuestions,
  parseIndex,
  selectNextTasks,
  sortTasks,
} from './jira-selector.mjs';

function document(order, status = 'TODO', phase = `Fase ${order}`) {
  return {
    order,
    phase,
    file: `/tmp/fase-${order}.md`,
    prefix: '',
    status,
    completion: 'DONE',
    updated: '',
    fromIndex: true,
  };
}

function task(id, doc, options = {}) {
  const {
    status = 'TODO',
    priority = 'P1',
    size = 'M',
    risk = 'Medio',
    dependencies = [],
    openQuestions = false,
    order = 0,
    title = id,
  } = options;
  return {
    id,
    title,
    status,
    priority,
    size,
    risk,
    dependencies,
    openQuestions,
    block: '',
    document: doc,
    line: 1,
    order,
  };
}

test('activeOrder devuelve el mayor orden no DONE', () => {
  const documents = [
    document(1, 'DONE'),
    document(3, 'IN PROGRESS'),
    document(4, 'TODO'),
    document(6, 'TODO'),
  ];
  assert.equal(activeOrder(documents), 6);
});

test('activeOrder devuelve null si todas las fases están DONE', () => {
  assert.equal(activeOrder([document(1, 'DONE'), document(2, 'DONE')]), null);
});

test('la fase activa ignora las tareas de fases anteriores', () => {
  const nxt = document(3, 'IN PROGRESS', 'Next Product');
  const hard = document(4, 'TODO', 'Hardening');
  const prd = document(6, 'TODO', 'Product polish');
  const documents = [nxt, hard, prd];
  const tasks = [
    task('CACH-NXT-010', nxt, { order: 0 }),
    task('CACH-HARD-001', hard, { priority: 'P0', order: 0 }),
    task('CACH-PRD-001', prd, { order: 0 }),
  ];
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));

  const selected = selectNextTasks(tasks, byId, {
    activeOnly: true,
    order: activeOrder(documents),
  });

  assert.equal(selected[0].id, 'CACH-PRD-001');
});

test('sin fase activa, --all mantiene el orden ascendente de fases', () => {
  const nxt = document(3, 'IN PROGRESS', 'Next Product');
  const hard = document(4, 'TODO', 'Hardening');
  const prd = document(6, 'TODO', 'Product polish');
  const tasks = [
    task('CACH-NXT-010', nxt, { order: 0 }),
    task('CACH-HARD-001', hard, { priority: 'P0', order: 0 }),
    task('CACH-PRD-001', prd, { order: 0 }),
  ];
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));

  const selected = selectNextTasks(tasks, byId, { activeOnly: false, order: null });

  assert.equal(selected[0].id, 'CACH-NXT-010');
});

test('dentro de la fase activa manda la prioridad y luego el orden del documento', () => {
  const prd = document(6, 'TODO', 'Product polish');
  const tasks = [
    task('CACH-PRD-002', prd, { priority: 'P1', order: 1 }),
    task('CACH-PRD-001', prd, { priority: 'P1', order: 0 }),
    task('CACH-PRD-005', prd, { priority: 'P2', order: 4 }),
  ];
  const ordered = sortTasks(tasks).map((candidate) => candidate.id);
  assert.deepEqual(ordered, ['CACH-PRD-001', 'CACH-PRD-002', 'CACH-PRD-005']);
});

test('excluye dependencias pendientes y preguntas abiertas', () => {
  const prd = document(6, 'TODO', 'Product polish');
  const dependency = task('CACH-PRD-003', prd, { status: 'TODO', order: 2 });
  const blocked = task('CACH-PRD-004', prd, { dependencies: ['CACH-PRD-003'], order: 1 });
  const questioned = task('CACH-PRD-005', prd, { openQuestions: true, order: 0 });
  const ready = task('CACH-PRD-001', prd, { order: 3 });
  const tasks = [blocked, questioned, ready, dependency];
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));

  const selected = selectNextTasks(tasks, byId, { activeOnly: true, order: 6 }).map(
    (candidate) => candidate.id,
  );

  assert.ok(selected.includes('CACH-PRD-001'));
  assert.ok(selected.includes('CACH-PRD-003'));
  assert.ok(!selected.includes('CACH-PRD-004'));
  assert.ok(!selected.includes('CACH-PRD-005'));
});

test('parseIndex lee las fases registradas y normaliza el estado', () => {
  const text = [
    '| Orden | Fase | Documento | Prefijo | Estado | Cierre | Última actualización |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| 3 | Next Product | `../NEXT.md` | `CACH-NXT` | IN PROGRESS | DONE | 2026-10-23 |',
    '| 6 | Product polish | `product.md` | `CACH-PRD` | TODO | DONE | 2026-10-28 |',
  ].join('\n');

  const documents = parseIndex(text);

  assert.equal(documents.length, 2);
  assert.deepEqual(
    documents.map((candidate) => [candidate.order, candidate.status, candidate.file]),
    [
      [3, 'IN PROGRESS', '../NEXT.md'],
      [6, 'TODO', 'product.md'],
    ],
  );
});

test('hasOpenQuestions distingue ausencia, "ninguna" y preguntas reales', () => {
  assert.equal(hasOpenQuestions('#### Alcance\n\n- Algo'), false);
  assert.equal(hasOpenQuestions('#### Preguntas abiertas\n\n- Ninguna.'), false);
  assert.equal(hasOpenQuestions('#### Preguntas abiertas\n\n- ¿Qué rol?'), true);
});

test('branchName usa el id en minúsculas y un slug del título', () => {
  const prd = document(6, 'TODO', 'Product polish');
  const card = task('CACH-PRD-001', prd, {
    title: 'Modales sin scroll anidado y con contenido completo',
  });
  assert.equal(
    branchName(card),
    'feat/cach-prd-001-modales-sin-scroll-anidado-y-con-contenido-compl',
  );
});
