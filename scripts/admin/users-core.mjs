const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export const GROUP_STRATEGIES = ['exact', 'domain', 'mailbox', 'alias'];
export const KEEP_POLICIES = ['verified-first', 'recent-login', 'oldest', 'newest'];
export const DEFAULT_GROUP_STRATEGY = 'mailbox';
export const DEFAULT_KEEP_POLICY = 'verified-first';
export const DEFAULT_MAX_DELETE = 50;

const GROUP_STRATEGY_SET = new Set(GROUP_STRATEGIES);
const KEEP_POLICY_SET = new Set(KEEP_POLICIES);

const GROUP_KEY_FUNCTIONS = {
  exact: (user) => normalizeEmail(user.email),
  domain: (user) => {
    const email = normalizeEmail(user.email);
    return email === null ? null : getDomain(email);
  },
  mailbox: (user) => {
    const email = normalizeEmail(user.email);
    return email === null ? null : getMailboxKey(email);
  },
  alias: (user) => {
    const email = normalizeEmail(user.email);
    return email === null ? null : getAliasBase(email);
  },
};

export function normalizeEmail(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function getLocalPart(email) {
  const normalized = normalizeEmail(email);
  if (normalized === null) {
    return null;
  }
  return normalized.slice(0, normalized.lastIndexOf('@'));
}

export function getDomain(email) {
  const normalized = normalizeEmail(email);
  if (normalized === null) {
    return null;
  }
  return normalized.slice(normalized.lastIndexOf('@') + 1) || null;
}

export function getAliasBase(email) {
  const localPart = getLocalPart(email);
  const domain = getDomain(email);
  if (localPart === null || domain === null) {
    return null;
  }
  const plusIndex = localPart.indexOf('+');
  const base = plusIndex === -1 ? localPart : localPart.slice(0, plusIndex);
  return base.length === 0 ? null : `${base}@${domain}`;
}

export function getMailboxKey(email) {
  const localPart = getLocalPart(email);
  const domain = getDomain(email);
  if (localPart === null || domain === null) {
    return null;
  }
  const plusIndex = localPart.indexOf('+');
  let base = plusIndex === -1 ? localPart : localPart.slice(0, plusIndex);
  if (GMAIL_DOMAINS.has(domain)) {
    base = base.replace(/\./g, '');
  }
  return base.length === 0 ? null : `${base}@${domain}`;
}

export function getProviderIds(user) {
  const providers = Array.isArray(user.providerData) ? user.providerData : [];
  return [
    ...new Set(
      providers
        .map((provider) => provider?.providerId)
        .filter((providerId) => typeof providerId === 'string' && providerId.length > 0),
    ),
  ];
}

export function isAnonymousUser(user) {
  return getProviderIds(user).includes('anonymous');
}

export function isAuthenticated(user) {
  return user.disabled !== true && Boolean(user.metadata?.lastSignInTime);
}

export function isCreated(user) {
  return Boolean(user.metadata?.creationTime);
}

export function classifyUser(user) {
  if (user.disabled === true) {
    return 'disabled';
  }
  if (normalizeEmail(user.email) === null) {
    return isAnonymousUser(user) ? 'anonymous' : 'no-email';
  }
  if (!user.metadata?.lastSignInTime) {
    return 'never-signed-in';
  }
  if (user.emailVerified !== true) {
    return 'unverified';
  }
  return 'active';
}

export function toUserView(user) {
  const email = normalizeEmail(user.email);
  return {
    uid: user.uid,
    email,
    domain: email === null ? null : getDomain(email),
    aliasBase: email === null ? null : getAliasBase(email),
    mailboxKey: email === null ? null : getMailboxKey(email),
    status: classifyUser(user),
    emailVerified: user.emailVerified === true,
    disabled: user.disabled === true,
    anonymous: isAnonymousUser(user),
    authenticated: isAuthenticated(user),
    created: isCreated(user),
    providers: getProviderIds(user),
    createdAt: user.metadata?.creationTime ?? null,
    lastSignInAt: user.metadata?.lastSignInTime ?? null,
    lastRefreshAt: user.metadata?.lastRefreshTime ?? null,
  };
}

export function compilePattern(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  if (typeof pattern !== 'string' || pattern.trim().length === 0) {
    throw new Error('The pattern must be a non-empty regular expression.');
  }
  try {
    return new RegExp(pattern, 'i');
  } catch {
    throw new Error(`Invalid regular expression: ${pattern}`);
  }
}

export function filterUsers(users, filters = {}) {
  const exactEmail = normalizeEmail(filters.email);
  const domain =
    typeof filters.domain === 'string'
      ? filters.domain.trim().toLowerCase().replace(/^@/, '')
      : null;
  const suffix =
    typeof filters.suffix === 'string' && filters.suffix.trim().length > 0
      ? filters.suffix.trim().toLowerCase()
      : null;
  const pattern = filters.pattern === undefined ? null : compilePattern(filters.pattern);
  const statuses = Array.isArray(filters.statuses) ? new Set(filters.statuses) : null;

  return users.filter((user) => {
    const email = normalizeEmail(user.email);

    if (exactEmail !== null && email !== exactEmail) {
      return false;
    }
    if (domain !== null && (email === null || getDomain(email) !== domain)) {
      return false;
    }
    if (suffix !== null && (email === null || !email.endsWith(suffix))) {
      return false;
    }
    if (pattern !== null && (email === null || !pattern.test(email))) {
      return false;
    }
    if (filters.verified === true && user.emailVerified !== true) {
      return false;
    }
    if (filters.verified === false && user.emailVerified === true) {
      return false;
    }
    if (filters.signedIn === true && !isAuthenticated(user)) {
      return false;
    }
    if (filters.signedIn === false && isAuthenticated(user)) {
      return false;
    }
    if (filters.neverSignedIn === true && Boolean(user.metadata?.lastSignInTime)) {
      return false;
    }
    if (filters.anonymous === true && !isAnonymousUser(user)) {
      return false;
    }
    if (filters.anonymous === false && isAnonymousUser(user)) {
      return false;
    }
    if (filters.disabled === true && user.disabled !== true) {
      return false;
    }
    if (filters.disabled === false && user.disabled === true) {
      return false;
    }
    if (filters.noEmail === true && classifyUser(user) !== 'no-email') {
      return false;
    }
    if (statuses !== null && !statuses.has(classifyUser(user))) {
      return false;
    }

    return true;
  });
}

export function groupDuplicates(users, options = {}) {
  const by = options.by ?? DEFAULT_GROUP_STRATEGY;
  if (!GROUP_STRATEGY_SET.has(by)) {
    throw new Error(`Unknown duplicate strategy: ${by}`);
  }
  const minSize = options.minSize ?? 2;
  const keyFor = GROUP_KEY_FUNCTIONS[by];
  const groups = new Map();

  for (const user of users) {
    const key = keyFor(user);
    if (key === null) {
      continue;
    }
    const group = groups.get(key) ?? [];
    group.push(user);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length >= minSize)
    .map(([key, group]) => ({
      key,
      strategy: by,
      count: group.length,
      users: sortByMostRecent(group),
    }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

export function pickSurvivor(group, options = {}) {
  const policy = options.policy ?? DEFAULT_KEEP_POLICY;
  if (!KEEP_POLICY_SET.has(policy)) {
    throw new Error(`Unknown keep policy: ${policy}`);
  }
  const keepUid = options.keepUid ?? null;
  if (keepUid !== null) {
    const kept = group.find((user) => user.uid === keepUid);
    if (kept !== undefined) {
      return kept;
    }
  }
  const sorted = [...group].sort((left, right) => compareUsers(left, right, policy));
  return sorted[0] ?? null;
}

export function planDeletion(users, options = {}) {
  const keepUids = new Set(options.keepUids ?? []);
  const keepPolicy = options.keepPolicy ?? DEFAULT_KEEP_POLICY;
  const groupBy = options.groupBy ?? null;
  const maxDelete = options.maxDelete ?? DEFAULT_MAX_DELETE;
  const force = options.force === true;
  const ownerUids = new Set(options.ownerUids ?? []);
  const skipped = [];

  if (groupBy !== null && !GROUP_STRATEGY_SET.has(groupBy)) {
    throw new Error(`Unknown duplicate strategy: ${groupBy}`);
  }
  if (!KEEP_POLICY_SET.has(keepPolicy)) {
    throw new Error(`Unknown keep policy: ${keepPolicy}`);
  }

  const groups = groupBy === null ? [] : groupDuplicates(users, { by: groupBy, minSize: 2 });
  const candidates = [];

  if (groupBy === null) {
    candidates.push(...users);
  } else {
    const groupedUids = new Set();
    for (const group of groups) {
      const groupKeepUid =
        [...keepUids].find((uid) => group.users.some((user) => user.uid === uid)) ?? null;
      const survivor = pickSurvivor(group.users, { policy: keepPolicy, keepUid: groupKeepUid });
      for (const user of group.users) {
        groupedUids.add(user.uid);
        if (survivor !== null && user.uid === survivor.uid) {
          skipped.push({ user, reason: 'kept-survivor' });
        } else {
          candidates.push(user);
        }
      }
    }
    for (const user of users) {
      if (!groupedUids.has(user.uid)) {
        skipped.push({ user, reason: 'unique' });
      }
    }
  }

  const seen = new Set();
  const toDelete = [];
  const blockedOwners = [];

  for (const user of candidates) {
    if (seen.has(user.uid)) {
      continue;
    }
    seen.add(user.uid);

    if (keepUids.has(user.uid)) {
      skipped.push({ user, reason: 'kept-by-uid' });
      continue;
    }
    if (ownerUids.has(user.uid)) {
      blockedOwners.push(user);
      if (!force) {
        skipped.push({ user, reason: 'owner-blocked' });
        continue;
      }
    }
    toDelete.push(user);
  }

  return {
    groupBy,
    groups,
    toDelete,
    skipped,
    blockedOwners,
    exceedsMax: toDelete.length > maxDelete,
    maxDelete,
  };
}

export function summarizeUsers(users) {
  const statuses = {};
  const domains = {};
  let withEmail = 0;
  let noEmail = 0;
  let anonymous = 0;
  let verified = 0;
  let unverified = 0;
  let disabled = 0;
  let signedIn = 0;
  let neverSignedIn = 0;

  for (const user of users) {
    const status = classifyUser(user);
    statuses[status] = (statuses[status] ?? 0) + 1;

    const email = normalizeEmail(user.email);
    if (email === null) {
      noEmail += 1;
    } else {
      withEmail += 1;
      const domain = getDomain(email);
      if (domain !== null) {
        domains[domain] = (domains[domain] ?? 0) + 1;
      }
      if (user.emailVerified === true) {
        verified += 1;
      } else {
        unverified += 1;
      }
    }

    if (isAnonymousUser(user)) {
      anonymous += 1;
    }
    if (user.disabled === true) {
      disabled += 1;
    }
    if (isAuthenticated(user)) {
      signedIn += 1;
    } else {
      neverSignedIn += 1;
    }
  }

  return {
    total: users.length,
    withEmail,
    noEmail,
    anonymous,
    verified,
    unverified,
    disabled,
    signedIn,
    neverSignedIn,
    statuses,
    domains: Object.entries(domains).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    ),
  };
}

export function formatTable(rows, headers) {
  const widths = headers.map((header, index) =>
    rows.reduce((width, row) => Math.max(width, String(row[index] ?? '').length), header.length),
  );
  const formatRow = (row) =>
    row.map((cell, index) => String(cell ?? '').padEnd(widths[index])).join('  ');
  return [
    formatRow(headers),
    widths.map((width) => '-'.repeat(width)).join('  '),
    ...rows.map(formatRow),
  ].join('\n');
}

export function formatUserTable(users) {
  if (users.length === 0) {
    return 'No users found.';
  }
  const views = users.map(toUserView);
  const headers = [
    'UID',
    'EMAIL',
    'STATUS',
    'AUTH',
    'VERIFIED',
    'PROVIDERS',
    'CREATED',
    'LAST SIGN-IN',
  ];
  const rows = views.map((view) => [
    view.uid,
    view.email ?? '-',
    view.status,
    view.authenticated ? 'yes' : 'no',
    view.emailVerified ? 'yes' : 'no',
    view.providers.join(',') || '-',
    formatDate(view.createdAt),
    formatDate(view.lastSignInAt),
  ]);
  return formatTable(rows, headers);
}

export function formatDuplicateGroups(groups, options = {}) {
  if (groups.length === 0) {
    return 'No duplicate groups found.';
  }
  const keepPolicy = options.keepPolicy ?? DEFAULT_KEEP_POLICY;
  const blocks = groups.map((group) => {
    const survivor = pickSurvivor(group.users, { policy: keepPolicy });
    const survivorUid = survivor?.uid ?? null;
    const headers = ['', 'UID', 'EMAIL', 'STATUS', 'VERIFIED', 'CREATED', 'LAST SIGN-IN'];
    const rows = group.users.map((user) => {
      const view = toUserView(user);
      return [
        view.uid === survivorUid ? '*' : ' ',
        view.uid,
        view.email ?? '-',
        view.status,
        view.emailVerified ? 'yes' : 'no',
        formatDate(view.createdAt),
        formatDate(view.lastSignInAt),
      ];
    });
    return [
      `[${group.strategy}] ${group.key} (${group.count})`,
      formatTable(rows, headers),
      survivorUid === null ? '' : `survivor: ${survivorUid}`,
    ]
      .filter((line) => line.length > 0)
      .join('\n');
  });
  return blocks.join('\n\n');
}

export function toCsv(users) {
  const headers = [
    'uid',
    'email',
    'status',
    'emailVerified',
    'disabled',
    'anonymous',
    'providers',
    'createdAt',
    'lastSignInAt',
    'domain',
    'mailboxKey',
  ];
  const rows = users.map((user) => {
    const view = toUserView(user);
    return [
      view.uid,
      view.email,
      view.status,
      view.emailVerified,
      view.disabled,
      view.anonymous,
      view.providers.join('|'),
      view.createdAt,
      view.lastSignInAt,
      view.domain,
      view.mailboxKey,
    ].map(escapeCsv);
  });
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function compareUsers(left, right, policy) {
  if (policy === 'oldest') {
    return timeValue(left.metadata?.creationTime) - timeValue(right.metadata?.creationTime);
  }
  if (policy === 'newest') {
    return timeValue(right.metadata?.creationTime) - timeValue(left.metadata?.creationTime);
  }
  if (policy === 'recent-login') {
    return (
      timeValue(right.metadata?.lastSignInTime) - timeValue(left.metadata?.lastSignInTime) ||
      Number(right.emailVerified === true) - Number(left.emailVerified === true) ||
      timeValue(left.metadata?.creationTime) - timeValue(right.metadata?.creationTime)
    );
  }
  return (
    Number(right.emailVerified === true) - Number(left.emailVerified === true) ||
    timeValue(right.metadata?.lastSignInTime) - timeValue(left.metadata?.lastSignInTime) ||
    timeValue(left.metadata?.creationTime) - timeValue(right.metadata?.creationTime)
  );
}

function sortByMostRecent(users) {
  return [...users].sort(
    (left, right) =>
      timeValue(right.metadata?.lastSignInTime) - timeValue(left.metadata?.lastSignInTime),
  );
}

function timeValue(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
