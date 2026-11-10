import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyUser,
  filterUsers,
  formatUserTable,
  getAliasBase,
  getDomain,
  getMailboxKey,
  groupDuplicates,
  normalizeEmail,
  pickSurvivor,
  planDeletion,
  summarizeUsers,
  toCsv,
} from './users-core.mjs';

function makeUser(overrides = {}) {
  const {
    uid = 'uid-1',
    email = 'user@example.com',
    emailVerified = true,
    disabled = false,
    providers = ['password'],
    createdAt = '2024-01-01T00:00:00.000Z',
    lastSignInAt = '2024-01-02T00:00:00.000Z',
  } = overrides;

  return {
    uid,
    email,
    emailVerified,
    disabled,
    providerData: providers.map((providerId) => ({ providerId })),
    metadata: {
      creationTime: createdAt,
      lastSignInTime: lastSignInAt,
      lastRefreshTime: lastSignInAt,
    },
  };
}

test('normalizeEmail recorta, normaliza y valida', () => {
  assert.equal(normalizeEmail('  Viewer+1@Example.COM '), 'viewer+1@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail(''), null);
  assert.equal(normalizeEmail(null), null);
});

test('calcula dominio, alias y buzón normalizado', () => {
  const email = 'viewer+1792532133889-1@example.com';
  assert.equal(getDomain(email), 'example.com');
  assert.equal(getAliasBase(email), 'viewer@example.com');
  assert.equal(getMailboxKey(email), 'viewer@example.com');
  assert.equal(getMailboxKey('John.Doe+qa@gmail.com'), 'johndoe@gmail.com');
  assert.equal(getMailboxKey('john.doe@example.com'), 'john.doe@example.com');
});

test('clasifica usuarios creados, autenticados y anónimos', () => {
  assert.equal(classifyUser(makeUser()), 'active');
  assert.equal(classifyUser(makeUser({ emailVerified: false })), 'unverified');
  assert.equal(classifyUser(makeUser({ lastSignInAt: null })), 'never-signed-in');
  assert.equal(classifyUser(makeUser({ disabled: true })), 'disabled');
  assert.equal(
    classifyUser(makeUser({ email: null, providers: ['anonymous'], emailVerified: false })),
    'anonymous',
  );
  assert.equal(classifyUser(makeUser({ email: null, providers: [] })), 'no-email');
});

test('filtra por email, dominio, sufijo y patrón', () => {
  const users = [
    makeUser({ uid: 'a', email: 'viewer+1@example.com' }),
    makeUser({ uid: 'b', email: 'viewer+2@example.com' }),
    makeUser({ uid: 'c', email: 'owner@gmail.com' }),
  ];

  assert.deepEqual(
    filterUsers(users, { email: 'VIEWER+1@example.com' }).map((user) => user.uid),
    ['a'],
  );
  assert.deepEqual(
    filterUsers(users, { domain: '@example.com' }).map((user) => user.uid),
    ['a', 'b'],
  );
  assert.deepEqual(
    filterUsers(users, { suffix: '+2@example.com' }).map((user) => user.uid),
    ['b'],
  );
  assert.deepEqual(
    filterUsers(users, { pattern: '^viewer\\+[0-9]+@example\\.com$' }).map((user) => user.uid),
    ['a', 'b'],
  );
});

test('filtra por estado de autenticación y verificación', () => {
  const users = [
    makeUser({ uid: 'verified', emailVerified: true }),
    makeUser({ uid: 'unverified', emailVerified: false }),
    makeUser({ uid: 'never', lastSignInAt: null, emailVerified: false }),
    makeUser({ uid: 'disabled', disabled: true, emailVerified: false }),
    makeUser({
      uid: 'anon',
      email: null,
      providers: ['anonymous'],
      emailVerified: false,
      lastSignInAt: null,
    }),
  ];

  assert.deepEqual(
    filterUsers(users, { signedIn: true, anonymous: false }).map((user) => user.uid),
    ['verified', 'unverified'],
  );
  assert.deepEqual(
    filterUsers(users, { neverSignedIn: true }).map((user) => user.uid),
    ['never', 'anon'],
  );
  assert.deepEqual(
    filterUsers(users, { verified: false }).map((user) => user.uid),
    ['unverified', 'never', 'disabled', 'anon'],
  );
  assert.deepEqual(
    filterUsers(users, { disabled: true }).map((user) => user.uid),
    ['disabled'],
  );
});

test('filtra usuarios anónimos y sin email', () => {
  const users = [
    makeUser({
      uid: 'anon',
      email: null,
      providers: ['anonymous'],
      emailVerified: false,
      lastSignInAt: null,
    }),
    makeUser({ uid: 'no-email', email: null, providers: [], emailVerified: false }),
    makeUser({ uid: 'with-email', email: 'user@example.com' }),
  ];

  assert.deepEqual(
    filterUsers(users, { anonymous: true }).map((user) => user.uid),
    ['anon'],
  );
  assert.deepEqual(
    filterUsers(users, { noEmail: true }).map((user) => user.uid),
    ['no-email'],
  );
});

test('agrupa duplicados por buzón, dominio, alias y email exacto', () => {
  const users = [
    makeUser({ uid: 'a', email: 'viewer+1792532133889-1@example.com' }),
    makeUser({ uid: 'b', email: 'viewer+1792532133889-2@example.com' }),
    makeUser({ uid: 'c', email: 'other@example.com' }),
  ];

  const byMailbox = groupDuplicates(users, { by: 'mailbox' });
  assert.equal(byMailbox.length, 1);
  assert.equal(byMailbox[0].key, 'viewer@example.com');
  assert.equal(byMailbox[0].count, 2);

  const byAlias = groupDuplicates(users, { by: 'alias' });
  assert.equal(byAlias.length, 1);
  assert.equal(byAlias[0].key, 'viewer@example.com');

  const byDomain = groupDuplicates(users, { by: 'domain' });
  assert.equal(byDomain.length, 1);
  assert.equal(byDomain[0].key, 'example.com');
  assert.equal(byDomain[0].count, 3);

  assert.deepEqual(groupDuplicates(users, { by: 'exact' }), []);
});

test('agrupa direcciones de Gmail ignorando puntos y etiquetas', () => {
  const users = [
    makeUser({ uid: 'a', email: 'john.doe+qa@gmail.com' }),
    makeUser({ uid: 'b', email: 'johndoe@gmail.com' }),
  ];

  const groups = groupDuplicates(users, { by: 'mailbox' });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'johndoe@gmail.com');
});

test('elige superviviente según la política', () => {
  const olderVerified = makeUser({
    uid: 'older-verified',
    emailVerified: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    lastSignInAt: '2023-01-02T00:00:00.000Z',
  });
  const newerUnverified = makeUser({
    uid: 'newer-unverified',
    emailVerified: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastSignInAt: '2024-06-01T00:00:00.000Z',
  });
  const group = [newerUnverified, olderVerified];

  assert.equal(pickSurvivor(group, { policy: 'verified-first' }).uid, 'older-verified');
  assert.equal(pickSurvivor(group, { policy: 'recent-login' }).uid, 'newer-unverified');
  assert.equal(pickSurvivor(group, { policy: 'oldest' }).uid, 'older-verified');
  assert.equal(pickSurvivor(group, { policy: 'newest' }).uid, 'newer-unverified');
  assert.equal(
    pickSurvivor(group, { policy: 'oldest', keepUid: 'newer-unverified' }).uid,
    'newer-unverified',
  );
});

test('planifica borrado conservando un superviviente por grupo', () => {
  const users = [
    makeUser({ uid: 'a', email: 'viewer+1@example.com', emailVerified: true }),
    makeUser({ uid: 'b', email: 'viewer+2@example.com', emailVerified: false }),
    makeUser({ uid: 'c', email: 'unique@example.com' }),
  ];

  const plan = planDeletion(users, {
    groupBy: 'mailbox',
    keepPolicy: 'verified-first',
    maxDelete: 10,
  });

  assert.deepEqual(
    plan.toDelete.map((user) => user.uid),
    ['b'],
  );
  assert.deepEqual(
    plan.skipped.map((entry) => [entry.user.uid, entry.reason]),
    [
      ['a', 'kept-survivor'],
      ['c', 'unique'],
    ],
  );
  assert.equal(plan.exceedsMax, false);
});

test('planifica borrado con keepUid, límite y owners', () => {
  const users = [
    makeUser({ uid: 'a', email: 'a@example.com' }),
    makeUser({ uid: 'b', email: 'b@example.com' }),
    makeUser({ uid: 'owner', email: 'owner@example.com' }),
  ];

  const limited = planDeletion(users, { keepUids: ['a'], maxDelete: 1 });
  assert.deepEqual(
    limited.toDelete.map((user) => user.uid),
    ['b', 'owner'],
  );
  assert.equal(limited.exceedsMax, true);

  const blocked = planDeletion(users, { ownerUids: ['owner'] });
  assert.deepEqual(
    blocked.toDelete.map((user) => user.uid),
    ['a', 'b'],
  );
  assert.deepEqual(
    blocked.blockedOwners.map((user) => user.uid),
    ['owner'],
  );
  assert.ok(blocked.skipped.some((entry) => entry.reason === 'owner-blocked'));

  const forced = planDeletion(users, { ownerUids: ['owner'], force: true });
  assert.deepEqual(
    forced.toDelete.map((user) => user.uid),
    ['a', 'b', 'owner'],
  );
});

test('resume usuarios por estado, dominio y autenticación', () => {
  const users = [
    makeUser({ uid: 'a', email: 'a@example.com', emailVerified: true }),
    makeUser({ uid: 'b', email: 'b@example.com', emailVerified: false }),
    makeUser({ uid: 'anon', email: null, providers: ['anonymous'], emailVerified: false }),
  ];

  const summary = summarizeUsers(users);
  assert.equal(summary.total, 3);
  assert.equal(summary.withEmail, 2);
  assert.equal(summary.noEmail, 1);
  assert.equal(summary.anonymous, 1);
  assert.equal(summary.verified, 1);
  assert.equal(summary.unverified, 1);
  assert.deepEqual(summary.domains, [['example.com', 2]]);
});

test('formatea tabla y CSV', () => {
  const users = [makeUser({ uid: 'a', email: 'a@example.com' })];
  const table = formatUserTable(users);
  assert.match(table, /UID/);
  assert.match(table, /a@example\.com/);

  const csv = toCsv(users);
  assert.match(csv, /^uid,email,status/m);
  assert.match(csv, /a@example\.com/);
});
