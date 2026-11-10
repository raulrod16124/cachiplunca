const AUTH_DELETE_BATCH_SIZE = 1000;
const FIRESTORE_IN_BATCH_SIZE = 30;
const FIRESTORE_READ_PAGE_SIZE = 500;
const FIRESTORE_WRITE_BATCH_SIZE = 500;

export async function listAllAuthUsers(auth, pageSize = AUTH_DELETE_BATCH_SIZE) {
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(pageSize, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

export async function deleteAuthUsers(auth, uids) {
  const uniqueUids = [...new Set(uids)];
  const successUids = [];
  const failed = [];

  for (const batch of chunks(uniqueUids, AUTH_DELETE_BATCH_SIZE)) {
    const result = await auth.deleteUsers(batch);
    const failedIndexes = new Set(result.errors.map((entry) => entry.index));
    for (const [index, uid] of batch.entries()) {
      if (failedIndexes.has(index)) {
        const failure = result.errors.find((entry) => entry.index === index);
        const failureError = failure?.error ?? failure;
        failed.push({
          uid,
          message: failureError?.message ?? String(failureError ?? 'Unknown Auth deletion error'),
        });
      } else {
        successUids.push(uid);
      }
    }
  }

  return { successUids, failed };
}

export async function findOwnerUids(db, uids) {
  const ownerUids = new Set();

  for (const batch of chunks([...new Set(uids)], FIRESTORE_IN_BATCH_SIZE)) {
    const snapshot = await db.collection('memberships').where('userId', 'in', batch).get();
    for (const document of snapshot.docs) {
      const data = document.data();
      if (data?.role === 'owner' && typeof data.userId === 'string') {
        ownerUids.add(data.userId);
      }
    }
  }

  return [...ownerUids];
}

export async function cascadeFirestore(db, users, options = {}) {
  const dryRun = options.dryRun === true;
  const includeInvitations = options.includeInvitations !== false;
  const uids = [...new Set(users.map((user) => user.uid).filter(isNonEmptyString))];
  const emails = [
    ...new Set(
      users
        .flatMap((user) =>
          isNonEmptyString(user.email) ? [user.email, user.email.toLowerCase()] : [],
        )
        .filter(isNonEmptyString),
    ),
  ];
  const counts = {};
  const errors = [];

  async function run(collectionName, operation) {
    try {
      counts[collectionName] = await operation();
    } catch (error) {
      counts[collectionName] = null;
      errors.push({ collection: collectionName, message: errorMessage(error) });
    }
  }

  await run('user_settings', () => deleteDirectDocuments(db, 'user_settings', uids, dryRun));
  await run('guest_sessions', () => deleteDirectDocuments(db, 'guest_sessions', uids, dryRun));
  await run('favorites', () => deleteByQuery(db, 'favorites', 'userId', uids, dryRun));
  await run('memberships', () => deleteByQuery(db, 'memberships', 'userId', uids, dryRun));
  await run('notifications', () => deleteByQuery(db, 'notifications', 'recipientId', uids, dryRun));
  await run('presence', () => deleteByQuery(db, 'presence', 'userId', uids, dryRun));

  if (includeInvitations) {
    await run('invitations', () => deleteByQuery(db, 'invitations', 'email', emails, dryRun));
  }

  return { dryRun, counts, errors };
}

async function deleteDirectDocuments(db, collectionName, uids, dryRun) {
  if (uids.length === 0) {
    return 0;
  }

  let count = 0;
  for (const batch of chunks(uids, FIRESTORE_WRITE_BATCH_SIZE)) {
    const references = batch.map((uid) => db.collection(collectionName).doc(uid));
    const snapshots = await db.getAll(...references);
    const existing = snapshots.filter((snapshot) => snapshot.exists);
    count += existing.length;
    if (!dryRun) {
      await deleteReferences(
        db,
        existing.map((snapshot) => snapshot.ref),
      );
    }
  }
  return count;
}

async function deleteByQuery(db, collectionName, field, values, dryRun) {
  if (values.length === 0) {
    return 0;
  }

  const references = [];
  for (const batch of chunks(values, FIRESTORE_IN_BATCH_SIZE)) {
    let lastDocument = null;
    while (true) {
      let query = db
        .collection(collectionName)
        .where(field, 'in', batch)
        .limit(FIRESTORE_READ_PAGE_SIZE);
      if (lastDocument !== null) {
        query = query.startAfter(lastDocument);
      }
      const snapshot = await query.get();
      references.push(...snapshot.docs.map((document) => document.ref));
      if (snapshot.size < FIRESTORE_READ_PAGE_SIZE) {
        break;
      }
      lastDocument = snapshot.docs[snapshot.docs.length - 1];
    }
  }

  if (!dryRun) {
    await deleteReferences(db, references);
  }
  return references.length;
}

async function deleteReferences(db, references) {
  for (const batch of chunks(references, FIRESTORE_WRITE_BATCH_SIZE)) {
    const writeBatch = db.batch();
    for (const reference of batch) {
      writeBatch.delete(reference);
    }
    await writeBatch.commit();
  }
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function errorMessage(error) {
  return error instanceof Error && error.message.length > 0 ? error.message : String(error);
}
