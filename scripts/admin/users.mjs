#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { closeAdminContext, createAdminContext } from './admin-context.mjs';
import {
  cascadeFirestore,
  deleteAuthUsers,
  findOwnerUids,
  listAllAuthUsers,
} from './users-admin.mjs';
import {
  DEFAULT_GROUP_STRATEGY,
  DEFAULT_KEEP_POLICY,
  DEFAULT_MAX_DELETE,
  GROUP_STRATEGIES,
  KEEP_POLICIES,
  filterUsers,
  formatDuplicateGroups,
  formatUserTable,
  groupDuplicates,
  pickSurvivor,
  planDeletion,
  summarizeUsers,
  toCsv,
  toUserView,
} from './users-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const OPTIONS = {
  project: { type: 'string' },
  emulator: { type: 'boolean', default: false },
  'service-account': { type: 'string' },
  format: { type: 'string', default: 'table' },
  email: { type: 'string' },
  domain: { type: 'string' },
  suffix: { type: 'string' },
  pattern: { type: 'string' },
  verified: { type: 'boolean', default: false },
  unverified: { type: 'boolean', default: false },
  'signed-in': { type: 'boolean', default: false },
  authenticated: { type: 'boolean', default: false },
  'never-signed-in': { type: 'boolean', default: false },
  anonymous: { type: 'boolean', default: false },
  'no-anonymous': { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
  'no-disabled': { type: 'boolean', default: false },
  'no-email': { type: 'boolean', default: false },
  status: { type: 'string', multiple: true },
  by: { type: 'string', default: DEFAULT_GROUP_STRATEGY },
  min: { type: 'string', default: '2' },
  'group-by': { type: 'string' },
  'keep-policy': { type: 'string', default: DEFAULT_KEEP_POLICY },
  'keep-uid': { type: 'string', multiple: true },
  'max-delete': { type: 'string', default: String(DEFAULT_MAX_DELETE) },
  force: { type: 'boolean', default: false },
  'no-cascade': { type: 'boolean', default: false },
  'no-invitations': { type: 'boolean', default: false },
  yes: { type: 'boolean', default: false },
  'dry-run': { type: 'boolean', default: false },
  report: { type: 'string' },
  uids: { type: 'string' },
  'uids-file': { type: 'string' },
  json: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
};

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      strict: true,
      options: OPTIONS,
    });
  } catch (error) {
    console.error(`Error: ${errorMessage(error)}`);
    console.error(usage());
    return 2;
  }

  const { values, positionals } = parsed;
  if (values.help === true || positionals.length === 0) {
    console.log(usage());
    return 0;
  }

  const command = positionals[0];
  try {
    if (command === 'list') {
      return await commandList(values);
    }
    if (command === 'duplicates') {
      return await commandDuplicates(values);
    }
    if (command === 'delete') {
      return await commandDelete(values);
    }
    if (command === 'cascade') {
      return await commandCascade(values);
    }
    if (command === 'doctor') {
      return await commandDoctor(values);
    }
    console.error(`Error: unknown command "${command}".`);
    console.error(usage());
    return 2;
  } catch (error) {
    console.error(`Error: ${errorMessage(error)}`);
    return 1;
  }
}

async function commandDoctor(values) {
  const context = await createAdminContext(contextOptions(values));
  try {
    const [authPage, settingsPage] = await Promise.all([
      context.auth.listUsers(1),
      context.db.collection('user_settings').limit(1).get(),
    ]);
    const result = {
      projectId: context.projectId,
      mode: context.mode,
      auth: 'ok',
      firestore: 'ok',
      sampleUsers: authPage.users.length,
      sampleUserSettings: settingsPage.size,
    };
    if (values.json === true) {
      printJson(result);
    } else {
      console.log(`Proyecto: ${result.projectId} (${result.mode})`);
      console.log('Firebase Auth: ok');
      console.log('Firestore: ok');
    }
    return 0;
  } finally {
    await closeAdminContext(context);
  }
}

async function commandList(values) {
  validatePrimaryFilters(values);
  const context = await createAdminContext(contextOptions(values));
  try {
    const allUsers = await listAllAuthUsers(context.auth);
    const matched = filterUsers(allUsers, buildFilters(values));
    const summary = summarizeUsers(matched);
    const asJson = values.json === true || values.format === 'json';

    if (asJson) {
      printJson({
        projectId: context.projectId,
        mode: context.mode,
        totalScanned: allUsers.length,
        totalMatched: matched.length,
        summary,
        users: matched.map(toUserView),
      });
    } else if (values.format === 'csv') {
      console.log(toCsv(matched));
    } else if (values.format === 'table') {
      console.log(`Proyecto: ${context.projectId} (${context.mode})`);
      console.log(formatUserTable(matched));
      console.log('');
      console.log(formatSummary(summary));
    } else {
      throw new Error(`Unknown format "${values.format}". Use table, json or csv.`);
    }

    return 0;
  } finally {
    await closeAdminContext(context);
  }
}

async function commandDuplicates(values) {
  validatePrimaryFilters(values);
  validateGroupStrategy(values.by, '--by');
  validateKeepPolicy(values['keep-policy']);
  const minSize = parsePositiveInt(values.min, 2, '--min');
  const context = await createAdminContext(contextOptions(values));

  try {
    const allUsers = await listAllAuthUsers(context.auth);
    const matched = filterUsers(allUsers, buildFilters(values));
    const groups = groupDuplicates(matched, { by: values.by, minSize });
    const potentialDeletions = groups.reduce((total, group) => total + group.count - 1, 0);
    const enrichedGroups = groups.map((group) => ({
      key: group.key,
      strategy: group.strategy,
      count: group.count,
      survivor: pickSurvivor(group.users, { policy: values['keep-policy'] })?.uid ?? null,
      users: group.users.map(toUserView),
    }));

    if (values.json === true) {
      printJson({
        projectId: context.projectId,
        mode: context.mode,
        totalScanned: allUsers.length,
        totalMatched: matched.length,
        strategy: values.by,
        minSize,
        groupCount: groups.length,
        potentialDeletions,
        groups: enrichedGroups,
      });
    } else {
      console.log(`Proyecto: ${context.projectId} (${context.mode})`);
      console.log(`Estrategia: ${values.by} | Mínimo por grupo: ${minSize}`);
      console.log(formatDuplicateGroups(groups, { keepPolicy: values['keep-policy'] }));
      console.log('');
      console.log(
        `Grupos: ${groups.length} | Usuarios agrupados: ${enrichedGroups.reduce((total, group) => total + group.count, 0)} | Borrados potenciales: ${potentialDeletions}`,
      );
    }

    return 0;
  } finally {
    await closeAdminContext(context);
  }
}

async function commandDelete(values) {
  const primaryFilters = validatePrimaryFilters(values, false);
  const hasGroupBy = typeof values['group-by'] === 'string' && values['group-by'].length > 0;
  if (primaryFilters === 0 && !hasGroupBy) {
    throw new Error(
      'Use one of --email, --domain, --suffix, --pattern, --anonymous or --no-email, or use --group-by.',
    );
  }
  if (hasGroupBy) {
    validateGroupStrategy(values['group-by'], '--group-by');
  }
  validateKeepPolicy(values['keep-policy']);

  const maxDelete = parsePositiveInt(values['max-delete'], DEFAULT_MAX_DELETE, '--max-delete');
  const dryRun = values.yes !== true || values['dry-run'] === true;
  const context = await createAdminContext(contextOptions(values));

  try {
    const allUsers = await listAllAuthUsers(context.auth);
    const matched = filterUsers(allUsers, buildFilters(values));

    if (matched.length === 0) {
      console.log('No users matched the filters.');
      return 0;
    }

    let ownerUids = [];
    try {
      ownerUids = await findOwnerUids(
        context.db,
        matched.map((user) => user.uid),
      );
    } catch (error) {
      if (values.force !== true) {
        throw new Error(
          `Could not verify workspace owners: ${errorMessage(error)}. Use --force to continue.`,
        );
      }
      console.error(`Warning: could not verify workspace owners: ${errorMessage(error)}`);
    }

    const plan = planDeletion(matched, {
      keepUids: values['keep-uid'] ?? [],
      keepPolicy: values['keep-policy'],
      groupBy: hasGroupBy ? values['group-by'] : null,
      maxDelete,
      force: values.force,
      ownerUids,
    });

    printDeletionPlan(context, plan, dryRun);

    if (plan.exceedsMax && values.force !== true) {
      console.error(
        `Error: ${plan.toDelete.length} users would be deleted, above --max-delete ${maxDelete}. Use --force to override.`,
      );
      return 1;
    }
    if (plan.blockedOwners.length > 0 && values.force !== true) {
      console.error(
        `Error: ${plan.blockedOwners.length} users own at least one workspace. Transfer ownership or use --force.`,
      );
      printUsers(plan.blockedOwners);
      return 1;
    }

    if (plan.toDelete.length === 0) {
      console.log('Nothing to delete.');
      return 0;
    }

    const report = buildDeleteReport(context, values, matched, plan, dryRun);
    if (dryRun) {
      const reportPath = await writeReport(values.report, report);
      console.log(`Dry run: no changes were made. Report: ${reportPath}`);
      return 0;
    }

    const authResult = await deleteAuthUsers(
      context.auth,
      plan.toDelete.map((user) => user.uid),
    );
    const successUids = new Set(authResult.successUids);
    const deletedUsers = plan.toDelete.filter((user) => successUids.has(user.uid));

    report.authDeleted = deletedUsers.map((user) => ({
      uid: user.uid,
      email: user.email ?? null,
    }));
    report.authFailures = authResult.failed;

    if (values['no-cascade'] !== true && deletedUsers.length > 0) {
      report.cascade = await cascadeFirestore(context.db, deletedUsers, {
        dryRun: false,
        includeInvitations: values['no-invitations'] !== true,
      });
    }

    report.finishedAt = new Date().toISOString();
    const reportPath = await writeReport(values.report, report);
    printDeleteResult(report, reportPath);

    return authResult.failed.length > 0 || (report.cascade?.errors.length ?? 0) > 0 ? 1 : 0;
  } finally {
    await closeAdminContext(context);
  }
}

async function commandCascade(values) {
  const context = await createAdminContext(contextOptions(values));
  try {
    const targets = await loadCascadeTargets(values, context.auth);
    const dryRun = values.yes !== true || values['dry-run'] === true;
    const cascade = await cascadeFirestore(context.db, targets, {
      dryRun,
      includeInvitations: values['no-invitations'] !== true,
    });
    const report = {
      command: 'cascade',
      projectId: context.projectId,
      mode: context.mode,
      dryRun,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      targets,
      cascade,
    };
    const reportPath = await writeReport(values.report, report, 'cascade');

    if (values.json === true) {
      printJson({ ...report, reportPath });
    } else {
      console.log(`Proyecto: ${context.projectId} (${context.mode})`);
      console.log(`Objetivos: ${targets.length}${dryRun ? ' (dry run)' : ''}`);
      printCascadeCounts(cascade);
      console.log(`Report: ${reportPath}`);
    }

    return cascade.errors.length > 0 ? 1 : 0;
  } finally {
    await closeAdminContext(context);
  }
}

function contextOptions(values) {
  return {
    projectId: values.project,
    emulator: values.emulator,
    serviceAccountPath: values['service-account'],
    rootDir: ROOT,
  };
}

function buildFilters(values) {
  const filters = {};
  if (values.email !== undefined) {
    filters.email = values.email;
  }
  if (values.domain !== undefined) {
    filters.domain = values.domain;
  }
  if (values.suffix !== undefined) {
    filters.suffix = values.suffix;
  }
  if (values.pattern !== undefined) {
    filters.pattern = values.pattern;
  }
  if (values.verified === true) {
    filters.verified = true;
  }
  if (values.unverified === true) {
    filters.verified = false;
  }
  if (values['signed-in'] === true || values.authenticated === true) {
    filters.signedIn = true;
  }
  if (values['never-signed-in'] === true) {
    filters.neverSignedIn = true;
  }
  if (values.anonymous === true) {
    filters.anonymous = true;
  }
  if (values['no-anonymous'] === true) {
    filters.anonymous = false;
  }
  if (values.disabled === true) {
    filters.disabled = true;
  }
  if (values['no-disabled'] === true) {
    filters.disabled = false;
  }
  if (values['no-email'] === true) {
    filters.noEmail = true;
  }
  if (Array.isArray(values.status) && values.status.length > 0) {
    filters.statuses = values.status;
  }
  return filters;
}

function validatePrimaryFilters(values, allowZero = true) {
  const emailSelectors = ['email', 'domain', 'suffix', 'pattern'].filter(
    (key) => typeof values[key] === 'string' && values[key].trim().length > 0,
  );
  const anonymous = values.anonymous === true;
  const noEmail = values['no-email'] === true;

  if (emailSelectors.length > 1) {
    throw new Error('Use only one of --email, --domain, --suffix or --pattern.');
  }
  if (anonymous && noEmail) {
    throw new Error('Use either --anonymous or --no-email, not both.');
  }
  if ((anonymous || noEmail) && emailSelectors.length > 0) {
    throw new Error('Do not combine --anonymous or --no-email with an email filter.');
  }
  if (values.verified === true && values.unverified === true) {
    throw new Error('Use either --verified or --unverified, not both.');
  }
  if (
    (values['signed-in'] === true || values.authenticated === true) &&
    values['never-signed-in'] === true
  ) {
    throw new Error('Use either --signed-in/--authenticated or --never-signed-in, not both.');
  }
  if (values.anonymous === true && values['no-anonymous'] === true) {
    throw new Error('Use either --anonymous or --no-anonymous, not both.');
  }
  if (values.disabled === true && values['no-disabled'] === true) {
    throw new Error('Use either --disabled or --no-disabled, not both.');
  }
  if (emailSelectors.length === 0 && !anonymous && !noEmail && !allowZero) {
    return 0;
  }
  return emailSelectors.length + Number(anonymous) + Number(noEmail);
}

function validateGroupStrategy(value, flag) {
  if (!GROUP_STRATEGIES.includes(value)) {
    throw new Error(`${flag} must be one of: ${GROUP_STRATEGIES.join(', ')}.`);
  }
}

function validateKeepPolicy(value) {
  if (!KEEP_POLICIES.includes(value)) {
    throw new Error(`--keep-policy must be one of: ${KEEP_POLICIES.join(', ')}.`);
  }
}

function parsePositiveInt(value, fallback, flag) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function printDeletionPlan(context, plan, dryRun) {
  console.log(`Proyecto: ${context.projectId} (${context.mode})`);
  console.log(
    `${dryRun ? 'Dry run' : 'Ejecución'} | A borrar: ${plan.toDelete.length} | Omitidos: ${plan.skipped.length} | Máximo: ${plan.maxDelete}`,
  );
  if (plan.groupBy !== null) {
    console.log(`Agrupación: ${plan.groupBy} | Grupos duplicados: ${plan.groups.length}`);
  }
  if (plan.blockedOwners.length > 0) {
    console.log(`Owners bloqueados: ${plan.blockedOwners.length}`);
    printUsers(plan.blockedOwners);
  }
  if (plan.toDelete.length > 0) {
    console.log(formatUserTable(plan.toDelete));
  }
  const skippedByReason = new Map();
  for (const entry of plan.skipped) {
    skippedByReason.set(entry.reason, (skippedByReason.get(entry.reason) ?? 0) + 1);
  }
  if (skippedByReason.size > 0) {
    console.log(
      `Omitidos por motivo: ${[...skippedByReason.entries()]
        .map(([reason, count]) => `${reason} (${count})`)
        .join(', ')}`,
    );
  }
}

function printUsers(users) {
  if (users.length === 0) {
    return;
  }
  console.log(formatUserTable(users));
}

function printDeleteResult(report, reportPath) {
  console.log(`Auth eliminados: ${report.authDeleted.length}`);
  if (report.authFailures.length > 0) {
    console.error(`Auth fallidos: ${report.authFailures.length}`);
    for (const failure of report.authFailures) {
      console.error(`  ${failure.uid}: ${failure.message}`);
    }
  }
  if (report.cascade !== undefined) {
    printCascadeCounts(report.cascade);
    if (report.cascade.errors.length > 0) {
      for (const error of report.cascade.errors) {
        console.error(`  ${error.collection}: ${error.message}`);
      }
    }
  }
  console.log(`Report: ${reportPath}`);
}

function printCascadeCounts(cascade) {
  const parts = Object.entries(cascade.counts).map(([collection, count]) => {
    return `${collection}: ${count === null ? 'error' : count}`;
  });
  console.log(
    `Firestore${cascade.dryRun ? ' (dry run)' : ''}: ${parts.join(' | ') || 'sin datos'}`,
  );
}

function formatSummary(summary) {
  const domains =
    summary.domains
      .slice(0, 8)
      .map(([domain, count]) => `${domain} (${count})`)
      .join(', ') || '-';
  return [
    `Total: ${summary.total} | Con email: ${summary.withEmail} | Sin email: ${summary.noEmail} | Anónimos: ${summary.anonymous}`,
    `Verificados: ${summary.verified} | Sin verificar: ${summary.unverified} | Deshabilitados: ${summary.disabled}`,
    `Con sesión: ${summary.signedIn} | Nunca iniciaron sesión: ${summary.neverSignedIn}`,
    `Dominios: ${domains}`,
  ].join('\n');
}

function buildDeleteReport(context, values, matched, plan, dryRun) {
  return {
    command: 'delete',
    projectId: context.projectId,
    mode: context.mode,
    dryRun,
    startedAt: new Date().toISOString(),
    filters: describeFilters(values),
    matched: matched.map(toUserView),
    toDelete: plan.toDelete.map(toUserView),
    skipped: plan.skipped.map((entry) => ({
      uid: entry.user.uid,
      email: entry.user.email ?? null,
      reason: entry.reason,
    })),
    blockedOwners: plan.blockedOwners.map((user) => ({
      uid: user.uid,
      email: user.email ?? null,
    })),
    groupBy: plan.groupBy,
    maxDelete: plan.maxDelete,
    exceedsMax: plan.exceedsMax,
    authDeleted: [],
    authFailures: [],
  };
}

function describeFilters(values) {
  return {
    email: values.email ?? null,
    domain: values.domain ?? null,
    suffix: values.suffix ?? null,
    pattern: values.pattern ?? null,
    verified: values.verified === true ? true : values.unverified === true ? false : null,
    signedIn:
      values['signed-in'] === true || values.authenticated === true
        ? true
        : values['never-signed-in'] === true
          ? false
          : null,
    anonymous: values.anonymous === true ? true : values['no-anonymous'] === true ? false : null,
    noEmail: values['no-email'] === true,
    disabled: values.disabled === true ? true : values['no-disabled'] === true ? false : null,
    statuses: values.status ?? [],
    groupBy: values['group-by'] ?? null,
    keepPolicy: values['keep-policy'] ?? DEFAULT_KEEP_POLICY,
    keepUids: values['keep-uid'] ?? [],
  };
}

async function loadCascadeTargets(values, auth) {
  const fromFile =
    values['uids-file'] === undefined ? null : await readUidFile(values['uids-file']);
  const fromArguments = values.uids === undefined ? null : parseUidList(values.uids);
  if (fromFile !== null && fromArguments !== null) {
    throw new Error('Use either --uids or --uids-file, not both.');
  }
  const rawTargets = fromFile ?? fromArguments;
  if (rawTargets === null || rawTargets.length === 0) {
    throw new Error('Use --uids or --uids-file to select users for the cascade.');
  }

  const targets = new Map();
  for (const entry of rawTargets) {
    const uid = typeof entry === 'string' ? entry.trim() : entry?.uid?.trim();
    if (typeof uid !== 'string' || uid.length === 0) {
      continue;
    }
    const email = typeof entry === 'object' && typeof entry.email === 'string' ? entry.email : null;
    targets.set(uid, { uid, email });
  }

  for (const target of targets.values()) {
    if (target.email !== null) {
      continue;
    }
    try {
      const user = await auth.getUser(target.uid);
      target.email = user.email ?? null;
    } catch {
      target.email = null;
    }
  }

  return [...targets.values()];
}

async function readUidFile(filePath) {
  const text = await readFile(path.resolve(ROOT, filePath), 'utf8');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`The UID file is not valid JSON: ${filePath}`);
  }

  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    for (const key of ['authDeleted', 'deletedAuth', 'toDelete', 'users', 'uids']) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }
  throw new Error(`The UID file does not contain a supported user list: ${filePath}`);
}

function parseUidList(value) {
  return value
    .split(/[\s,]+/)
    .map((uid) => uid.trim())
    .filter((uid) => uid.length > 0);
}

async function writeReport(reportPath, report, prefix = 'users') {
  const resolved =
    reportPath === undefined
      ? path.join(ROOT, '.local/admin', `${prefix}-${timestamp()}.json`)
      : path.resolve(ROOT, reportPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return resolved;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function errorMessage(error) {
  return error instanceof Error && error.message.length > 0 ? error.message : String(error);
}

function usage() {
  return `Cachiplunca admin users

Uso:
  npm run admin:users -- <comando> [opciones]

Comandos:
  list          Lista usuarios de Firebase Auth
  duplicates    Agrupa usuarios por email exacto, dominio, buzón o alias
  delete        Borra usuarios por filtro y limpia Firestore
  cascade       Limpia Firestore para UIDs ya borrados de Auth
  doctor        Comprueba credenciales, proyecto y emuladores

Opciones generales:
  --project <id>            Proyecto Firebase
  --emulator                Usa Auth/Firestore emulator (proyecto demo-*)
  --service-account <path>  JSON de service account
  --json                    Salida JSON
  --help                    Muestra esta ayuda

List y duplicates:
  --email <exacto>
  --domain <dominio>
  --suffix <texto>
  --pattern <regex>
  --verified / --unverified
  --signed-in / --authenticated / --never-signed-in
  --anonymous / --no-anonymous
  --no-email
  --disabled / --no-disabled
  --status <estado> (repetible)
  --by <exact|domain|mailbox|alias>
  --min <n>

Delete:
  --email <exacto> | --domain <dominio> | --suffix <texto> | --pattern <regex>
  --anonymous | --no-email
  --group-by <exact|domain|mailbox|alias>
  --keep-policy <verified-first|recent-login|oldest|newest>
  --keep-uid <uid> (repetible)
  --max-delete <n>
  --force
  --no-cascade
  --no-invitations
  --yes
  --dry-run
  --report <ruta> (usa .local/admin o fuera del repo)

Cascade:
  --uids <uid,uid>
  --uids-file <ruta>
  --yes / --dry-run

Ejemplos:
  npm run admin:users -- list --json
  npm run admin:users -- duplicates --by mailbox
  npm run admin:users -- delete --anonymous --dry-run
  npm run admin:users -- delete --no-email --dry-run
  npm run admin:users -- delete --pattern '^viewer\\+[0-9]+-[0-9]+@example\\.com$' --dry-run
  npm run admin:users -- delete --pattern '^viewer\\+[0-9]+-[0-9]+@example\\.com$' --yes
`;
}

const exitCode = await main();
process.exitCode = exitCode;
