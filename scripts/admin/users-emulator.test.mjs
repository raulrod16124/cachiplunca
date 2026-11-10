import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { closeAdminContext, createAdminContext } from './admin-context.mjs';
import {
  cascadeFirestore,
  deleteAuthUsers,
  findOwnerUids,
  listAllAuthUsers,
} from './users-admin.mjs';
import { filterUsers, groupDuplicates } from './users-core.mjs';

const projectId = 'demo-cachiplunca';
const prefix = `viewer+${Date.now()}`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const execFileAsync = promisify(execFile);

let context;
const createdUsers = [];

before(async () => {
  context = await createAdminContext({
    emulator: true,
    projectId,
    appName: `cachiplunca-admin-test-${Date.now()}`,
  });
});

after(async () => {
  if (context !== undefined) {
    await cascadeFirestore(context.db, createdUsers).catch(() => undefined);
    if (createdUsers.length > 0) {
      await context.auth.deleteUsers(createdUsers.map((user) => user.uid)).catch(() => undefined);
    }
    await closeAdminContext(context);
  }
});

test('lista usuarios creados en el emulador de Auth', async () => {
  const first = await createUser('list-a');
  const second = await createUser('list-b');

  const users = await listAllAuthUsers(context.auth);
  const uids = new Set(users.map((user) => user.uid));

  assert.ok(uids.has(first.uid));
  assert.ok(uids.has(second.uid));
});

test('detecta duplicados por buzón y filtra por patrón', async () => {
  const first = await createUser('duplicate-a');
  const second = await createUser('duplicate-b');

  const users = await listAllAuthUsers(context.auth);
  const matched = filterUsers(users, {
    pattern: `^${escapeRegExp(prefix)}-duplicate-[ab]@example\\.com$`,
  });
  const groups = groupDuplicates(matched, { by: 'mailbox' });

  assert.equal(matched.length, 2);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'viewer@example.com');
  assert.deepEqual(groups[0].users.map((user) => user.uid).sort(), [first.uid, second.uid].sort());
});

test('el CLI acepta --anonymous y --no-email como selectores de borrado', async () => {
  for (const flag of ['--anonymous', '--no-email']) {
    const result = await execFileAsync(
      process.execPath,
      ['scripts/admin/users.mjs', 'delete', flag, '--emulator', '--dry-run'],
      { cwd: repoRoot, env: process.env },
    );
    assert.match(result.stdout, /No users matched the filters\./);
  }
});

test('el CLI rechaza selectores de borrado incompatibles', async () => {
  await assert.rejects(
    execFileAsync(
      process.execPath,
      ['scripts/admin/users.mjs', 'delete', '--anonymous', '--no-email', '--emulator', '--dry-run'],
      { cwd: repoRoot, env: process.env },
    ),
    (error) =>
      error.code === 1 && /Use either --anonymous or --no-email, not both\./.test(error.stderr),
  );

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        'scripts/admin/users.mjs',
        'delete',
        '--no-email',
        '--domain',
        'example.com',
        '--emulator',
        '--dry-run',
      ],
      { cwd: repoRoot, env: process.env },
    ),
    (error) => error.code === 1 && /Do not combine --anonymous or --no-email/.test(error.stderr),
  );
});

test('el cascade en dry run no borra documentos', async () => {
  const user = await createUser('dry-run');
  await seedUserDocuments(user);

  const result = await cascadeFirestore(context.db, [user], { dryRun: true });
  assert.equal(result.errors.length, 0);
  assert.equal(result.counts.user_settings, 1);
  assert.equal(result.counts.favorites, 1);

  const settings = await context.db.collection('user_settings').doc(user.uid).get();
  assert.equal(settings.exists, true);
});

test('borra Auth y hace cascade de los datos personales de Firestore', async () => {
  const user = await createUser('delete');
  await seedUserDocuments(user);

  const authResult = await deleteAuthUsers(context.auth, [user.uid]);
  assert.deepEqual(authResult.successUids, [user.uid]);
  assert.equal(authResult.failed.length, 0);
  await assert.rejects(() => context.auth.getUser(user.uid));

  const result = await cascadeFirestore(context.db, [user]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.counts.user_settings, 1);
  assert.equal(result.counts.guest_sessions, 1);
  assert.equal(result.counts.favorites, 1);
  assert.equal(result.counts.memberships, 1);
  assert.equal(result.counts.notifications, 1);
  assert.equal(result.counts.presence, 1);
  assert.equal(result.counts.invitations, 1);

  const settings = await context.db.collection('user_settings').doc(user.uid).get();
  const favorites = await context.db.collection('favorites').doc(`${user.uid}_ws`).get();
  assert.equal(settings.exists, false);
  assert.equal(favorites.exists, false);
});

test('detecta owners antes de borrar', async () => {
  const user = await createUser('owner');
  await context.db
    .collection('memberships')
    .doc(`owner_ws_${user.uid}`)
    .set({ userId: user.uid, workspaceId: 'owner_ws', role: 'owner' });

  const ownerUids = await findOwnerUids(context.db, [user.uid]);
  assert.deepEqual(ownerUids, [user.uid]);
});

async function createUser(suffix) {
  const user = await context.auth.createUser({
    email: `${prefix}-${suffix}@example.com`,
    emailVerified: suffix !== 'duplicate-b',
    password: 'Secret123',
    displayName: suffix,
  });
  createdUsers.push({ uid: user.uid, email: user.email ?? null });
  return user;
}

async function seedUserDocuments(user) {
  const uid = user.uid;
  const email = user.email ?? null;

  await context.db.collection('user_settings').doc(uid).set({ userId: uid });
  await context.db.collection('guest_sessions').doc(uid).set({ userId: uid });
  await context.db
    .collection('favorites')
    .doc(`${uid}_ws`)
    .set({ id: `${uid}_ws`, userId: uid, workspaceId: 'ws' });
  await context.db
    .collection('memberships')
    .doc(`ws_${uid}`)
    .set({ userId: uid, workspaceId: 'ws', role: 'viewer' });
  await context.db.collection('notifications').doc(`n_${uid}`).set({ recipientId: uid });
  await context.db.collection('presence').doc(`ws_${uid}`).set({ userId: uid });
  if (email !== null) {
    await context.db.collection('invitations').doc(`inv_${uid}`).set({ email });
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
