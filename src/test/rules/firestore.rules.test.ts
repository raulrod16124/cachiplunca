import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = 'demo-cachiplunca';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const OWNER_UID = 'owner-user';
const EDITOR_UID = 'editor-user';
const VIEWER_UID = 'viewer-user';
const OUTSIDER_UID = 'outsider-user';
const INVITEE_EMAIL = 'invitee@example.com';

const WS1 = 'ws1';
const WS2 = 'ws2';

const now = new Date('2026-10-13T00:00:00.000Z');

function workspaceData(name = 'Workspace') {
  return { name, description: null, createdAt: now, updatedAt: now };
}

function membershipData(userId: string, role: string) {
  return { userId, workspaceId: WS1, role, createdAt: now, updatedAt: now };
}

function elementData(createdBy: string, id = 'e1') {
  return {
    type: 'text',
    id,
    workspaceId: WS1,
    position: { x: 0, y: 0 },
    size: { width: 120, height: 40 },
    rotation: 0,
    content: 'Hello',
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

function presenceData(userId: string) {
  return {
    workspaceId: WS1,
    userId,
    lastSeenAt: now,
    cursor: { x: 1, y: 2 },
  };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'workspaces', WS1), workspaceData());
    await setDoc(doc(db, 'workspaces', WS2), workspaceData('Second'));
    await setDoc(doc(db, 'memberships', `${WS1}_${OWNER_UID}`), membershipData(OWNER_UID, 'owner'));
    await setDoc(
      doc(db, 'memberships', `${WS1}_${EDITOR_UID}`),
      membershipData(EDITOR_UID, 'editor'),
    );
    await setDoc(
      doc(db, 'memberships', `${WS1}_${VIEWER_UID}`),
      membershipData(VIEWER_UID, 'viewer'),
    );
    await setDoc(doc(db, 'elements', 'e1'), elementData(OWNER_UID));
    await setDoc(doc(db, 'presence', `${WS1}_${VIEWER_UID}`), presenceData(VIEWER_UID));
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function dbOf(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function invitedDb() {
  return testEnv.authenticatedContext('invitee-user', { email: INVITEE_EMAIL }).firestore();
}

function unauthed(): RulesTestContext {
  return testEnv.unauthenticatedContext();
}

describe('firestore.rules — elements', () => {
  test('owner and editor can create an element', async () => {
    for (const uid of [OWNER_UID, EDITOR_UID]) {
      await assertSucceeds(
        setDoc(doc(dbOf(uid), 'elements', 'created'), elementData(uid, 'created')),
      );
    }
  });

  test('a viewer, outsider or anonymous user cannot create an element', async () => {
    await assertFails(
      setDoc(doc(dbOf(VIEWER_UID), 'elements', 'created'), elementData(VIEWER_UID, 'created')),
    );
    await assertFails(
      setDoc(doc(dbOf(OUTSIDER_UID), 'elements', 'created'), elementData(OUTSIDER_UID, 'created')),
    );
    await assertFails(
      setDoc(
        doc(unauthed().firestore(), 'elements', 'created'),
        elementData(OUTSIDER_UID, 'created'),
      ),
    );
  });

  test('a create cannot spoof another user in createdBy', async () => {
    await assertFails(
      setDoc(doc(dbOf(EDITOR_UID), 'elements', 'spoofed'), elementData(OWNER_UID, 'spoofed')),
    );
  });

  test('owner and editor can update an element', async () => {
    for (const uid of [OWNER_UID, EDITOR_UID]) {
      await assertSucceeds(updateDoc(doc(dbOf(uid), 'elements', 'e1'), { updatedAt: now }));
    }
  });

  test('owner and editor can delete an element', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'elements', 'del-owner'),
        elementData(OWNER_UID, 'del-owner'),
      );
      await setDoc(
        doc(ctx.firestore(), 'elements', 'del-editor'),
        elementData(OWNER_UID, 'del-editor'),
      );
    });
    await assertSucceeds(deleteDoc(doc(dbOf(OWNER_UID), 'elements', 'del-owner')));
    await assertSucceeds(deleteDoc(doc(dbOf(EDITOR_UID), 'elements', 'del-editor')));
  });

  test('a viewer cannot update or delete an element', async () => {
    await assertFails(updateDoc(doc(dbOf(VIEWER_UID), 'elements', 'e1'), { updatedAt: now }));
    await assertFails(deleteDoc(doc(dbOf(VIEWER_UID), 'elements', 'e1')));
  });

  test('an update cannot change the workspaceId of an element', async () => {
    await assertFails(
      updateDoc(doc(dbOf(OWNER_UID), 'elements', 'e1'), { workspaceId: WS2, updatedAt: now }),
    );
  });

  test('members can read an element; outsiders and anonymous cannot', async () => {
    for (const uid of [OWNER_UID, EDITOR_UID, VIEWER_UID]) {
      await assertSucceeds(getDoc(doc(dbOf(uid), 'elements', 'e1')));
    }
    await assertFails(getDoc(doc(dbOf(OUTSIDER_UID), 'elements', 'e1')));
    await assertFails(getDoc(doc(unauthed().firestore(), 'elements', 'e1')));
  });
});

describe('firestore.rules — workspaces', () => {
  test('any authenticated user can create a workspace; anonymous cannot', async () => {
    await assertSucceeds(setDoc(doc(dbOf(EDITOR_UID), 'workspaces', 'new'), workspaceData()));
    await assertFails(setDoc(doc(unauthed().firestore(), 'workspaces', 'new'), workspaceData()));
  });

  test('only the owner can update or delete a workspace', async () => {
    await assertSucceeds(updateDoc(doc(dbOf(OWNER_UID), 'workspaces', WS1), { name: 'Renamed' }));
    await assertFails(updateDoc(doc(dbOf(VIEWER_UID), 'workspaces', WS1), { name: 'Renamed' }));
    await assertFails(deleteDoc(doc(dbOf(EDITOR_UID), 'workspaces', WS1)));
    await assertSucceeds(deleteDoc(doc(dbOf(OWNER_UID), 'workspaces', WS1)));
  });
});

describe('firestore.rules — memberships', () => {
  test('only the owner can change a role or remove another member', async () => {
    const target = doc(dbOf(OWNER_UID), 'memberships', `${WS1}_${VIEWER_UID}`);
    await assertSucceeds(updateDoc(target, { role: 'editor', updatedAt: now }));
    await assertFails(
      updateDoc(doc(dbOf(EDITOR_UID), 'memberships', `${WS1}_${VIEWER_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
    await assertSucceeds(deleteDoc(target));
    await assertFails(deleteDoc(doc(dbOf(VIEWER_UID), 'memberships', `${WS1}_${EDITOR_UID}`)));
  });

  test('a member can leave (delete their own membership)', async () => {
    await assertSucceeds(deleteDoc(doc(dbOf(VIEWER_UID), 'memberships', `${WS1}_${VIEWER_UID}`)));
  });

  test('an owner role change cannot rewrite the membership identity', async () => {
    await assertFails(
      updateDoc(doc(dbOf(OWNER_UID), 'memberships', `${WS1}_${VIEWER_UID}`), {
        userId: EDITOR_UID,
        updatedAt: now,
      }),
    );
  });

  test('a user can read their own membership and members can read the roster', async () => {
    await assertSucceeds(getDoc(doc(dbOf(VIEWER_UID), 'memberships', `${WS1}_${VIEWER_UID}`)));
    await assertSucceeds(
      getDocs(query(collection(dbOf(OWNER_UID), 'memberships'), where('workspaceId', '==', WS1))),
    );
    await assertFails(
      getDocs(
        query(collection(dbOf(OUTSIDER_UID), 'memberships'), where('workspaceId', '==', WS1)),
      ),
    );
  });

  test('reading a non-existent membership returns null instead of denying', async () => {
    const snapshot = await getDoc(doc(dbOf(OWNER_UID), 'memberships', `${WS1}_${OUTSIDER_UID}`));
    expect(snapshot.exists()).toBe(false);
  });

  test('self-create of a membership is allowed (accept-invitation limitation)', async () => {
    const db = dbOf(VIEWER_UID);
    await assertSucceeds(
      setDoc(doc(db, 'memberships', `${WS2}_${VIEWER_UID}`), {
        ...membershipData(VIEWER_UID, 'editor'),
        workspaceId: WS2,
      }),
    );
  });
});

describe('firestore.rules — invitations', () => {
  function invitationData(workspaceId = WS1, status = 'pending') {
    return {
      id: 'inv1',
      workspaceId,
      email: INVITEE_EMAIL,
      role: 'editor',
      tokenHash: '0a'.repeat(32),
      status,
      invitedBy: OWNER_UID,
      expiresAt: new Date('2026-10-20T00:00:00.000Z'),
      createdAt: now,
      updatedAt: now,
    };
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitations', 'inv1'), invitationData());
    });
  });

  test('owner and editor can invite; a viewer cannot', async () => {
    for (const uid of [OWNER_UID, EDITOR_UID]) {
      await assertSucceeds(setDoc(doc(dbOf(uid), 'invitations', 'inv2'), invitationData(WS1)));
    }
    await assertFails(setDoc(doc(dbOf(VIEWER_UID), 'invitations', 'inv2'), invitationData(WS1)));
  });

  test('an invitation flags invitedBy === auth.uid', async () => {
    await assertFails(
      setDoc(doc(dbOf(EDITOR_UID), 'invitations', 'inv2'), {
        ...invitationData(WS1),
        invitedBy: OWNER_UID,
      }),
    );
  });

  test('the invitee whose email matches can accept a pending invitation', async () => {
    await assertSucceeds(
      updateDoc(doc(invitedDb(), 'invitations', 'inv1'), { status: 'accepted', updatedAt: now }),
    );
  });

  test('a pending invitation cannot be accepted by someone else or tampered with', async () => {
    await assertFails(
      updateDoc(doc(dbOf(OUTSIDER_UID), 'invitations', 'inv1'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(invitedDb(), 'invitations', 'inv1'), {
        role: 'owner',
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });

  test('an owner or editor can accept/revoke an invitation', async () => {
    await assertSucceeds(
      updateDoc(doc(dbOf(OWNER_UID), 'invitations', 'inv1'), { status: 'revoked', updatedAt: now }),
    );
  });
});

describe('firestore.rules — presence', () => {
  test('a member can announce and withdraw their own presence', async () => {
    await assertSucceeds(
      setDoc(doc(dbOf(VIEWER_UID), 'presence', `${WS1}_${VIEWER_UID}`), presenceData(VIEWER_UID)),
    );
    await assertSucceeds(deleteDoc(doc(dbOf(VIEWER_UID), 'presence', `${WS1}_${VIEWER_UID}`)));
  });

  test('a user can only write their own presence', async () => {
    await assertFails(
      setDoc(doc(dbOf(OUTSIDER_UID), 'presence', `${WS1}_${VIEWER_UID}`), presenceData(VIEWER_UID)),
    );
  });

  test('members can read presence; outsiders cannot', async () => {
    await assertSucceeds(getDoc(doc(dbOf(VIEWER_UID), 'presence', `${WS1}_${VIEWER_UID}`)));
    await assertFails(getDoc(doc(dbOf(OUTSIDER_UID), 'presence', `${WS1}_${VIEWER_UID}`)));
  });
});
