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
import {
  can,
  WORKSPACE_OPERATIONS,
  type WorkspaceOperation,
} from '../../domain/membership/authorization-policy';
import type { MembershipRole } from '../../domain/membership/role';

const PROJECT_ID = 'demo-cachiplunca';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const ROLES: readonly MembershipRole[] = ['owner', 'editor', 'viewer'];

// Each role has a deterministic uid so the matrix test can derive the actor and
// its membership id from the role under test.
const ROLE_UIDS: Readonly<Record<MembershipRole, string>> = {
  owner: 'owner-user',
  editor: 'editor-user',
  viewer: 'viewer-user',
};

const OTHER_ROLE_UIDS = ROLES.map((role) => ROLE_UIDS[role]);

const VICTIM_UID = 'victim-user';
const OUTSIDER_UID = 'outsider-user';
const INVITEE_UID = 'invitee-user';
const INVITEE_EMAIL = 'invitee@example.com';
const OTHER_EMAIL = 'other@example.com';
const CREATOR_UID = 'creator-user';

const WS1 = 'ws1';
const WS2 = 'ws2';
const NEW_WS = 'new-ws';

const now = new Date('2026-10-13T00:00:00.000Z');

function workspaceData(name = 'Workspace', createdBy = ROLE_UIDS.owner) {
  return { name, description: null, createdBy, createdAt: now, updatedAt: now };
}

function membershipData(workspaceId: string, userId: string, role: string, invitationId?: string) {
  const data: Record<string, unknown> = {
    userId,
    workspaceId,
    role,
    createdAt: now,
    updatedAt: now,
  };
  if (invitationId !== undefined) {
    data.invitationId = invitationId;
  }
  return data;
}

function elementData(workspaceId: string, createdBy: string, id: string) {
  return {
    type: 'text',
    id,
    workspaceId,
    position: { x: 0, y: 0 },
    size: { width: 120, height: 40 },
    rotation: 0,
    content: 'Hello',
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

function presenceData(workspaceId: string, userId: string) {
  return {
    workspaceId,
    userId,
    lastSeenAt: now,
    cursor: { x: 1, y: 2 },
  };
}

function invitationData(
  workspaceId: string,
  invitedBy: string,
  status = 'pending',
  email = INVITEE_EMAIL,
  role: MembershipRole = 'editor',
  id = `inv-${email}`,
) {
  return {
    id,
    workspaceId,
    email,
    role,
    tokenHash: '0a'.repeat(32),
    status,
    invitedBy,
    expiresAt: new Date('2026-10-20T00:00:00.000Z'),
    createdAt: now,
    updatedAt: now,
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
    await setDoc(doc(db, 'workspaces', WS1), workspaceData('Workspace', ROLE_UIDS.owner));
    await setDoc(doc(db, 'workspaces', WS2), workspaceData('Second', ROLE_UIDS.viewer));
    await setDoc(
      doc(db, 'memberships', `${WS1}_${ROLE_UIDS.owner}`),
      membershipData(WS1, ROLE_UIDS.owner, 'owner'),
    );
    await setDoc(
      doc(db, 'memberships', `${WS1}_${ROLE_UIDS.editor}`),
      membershipData(WS1, ROLE_UIDS.editor, 'editor'),
    );
    await setDoc(
      doc(db, 'memberships', `${WS1}_${ROLE_UIDS.viewer}`),
      membershipData(WS1, ROLE_UIDS.viewer, 'viewer'),
    );
    await setDoc(
      doc(db, 'memberships', `${WS1}_${VICTIM_UID}`),
      membershipData(WS1, VICTIM_UID, 'viewer'),
    );
    await setDoc(doc(db, 'elements', 'e1'), elementData(WS1, ROLE_UIDS.owner, 'e1'));
    await setDoc(doc(db, 'elements', 'e2'), elementData(WS2, ROLE_UIDS.owner, 'e2'));
    await setDoc(
      doc(db, 'presence', `${WS1}_${ROLE_UIDS.viewer}`),
      presenceData(WS1, ROLE_UIDS.viewer),
    );
    await setDoc(
      doc(db, 'invitations', 'inv1'),
      invitationData(WS1, ROLE_UIDS.owner, 'pending', INVITEE_EMAIL),
    );
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function dbOf(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function dbWithEmail(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

function unauthed(): RulesTestContext {
  return testEnv.unauthenticatedContext();
}

// Representation of each permission operation as a concrete Firestore action,
// used by the parity test to assert `rules === PERMISSION_MATRIX` (ADR-0021).
type RulesFirestore = ReturnType<RulesTestContext['firestore']>;

function operationAction(
  op: WorkspaceOperation,
  uid: string,
): (db: RulesFirestore) => Promise<unknown> {
  switch (op) {
    case 'workspace:view':
      return (db) => getDoc(doc(db, 'workspaces', WS1));
    case 'workspace:update':
      return (db) => updateDoc(doc(db, 'workspaces', WS1), { name: 'Updated' });
    case 'workspace:delete':
      return (db) => deleteDoc(doc(db, 'workspaces', WS1));
    case 'element:write':
      return (db) => setDoc(doc(db, 'elements', `el-${uid}`), elementData(WS1, uid, `el-${uid}`));
    case 'member:invite':
      return (db) => setDoc(doc(db, 'invitations', `inv-${uid}`), invitationData(WS1, uid));
    case 'member:update-role':
      return (db) =>
        updateDoc(doc(db, 'memberships', `${WS1}_${VICTIM_UID}`), {
          role: 'editor',
          updatedAt: now,
        });
    case 'member:remove':
      return (db) => deleteDoc(doc(db, 'memberships', `${WS1}_${VICTIM_UID}`));
    case 'member:leave':
      return (db) => deleteDoc(doc(db, 'memberships', `${WS1}_${uid}`));
  }
}

describe('firestore.rules — parity with PERMISSION_MATRIX (ADR-0021)', () => {
  const combos = ROLES.flatMap((role) => WORKSPACE_OPERATIONS.map((op) => ({ role, op })));

  it.each(combos)('can($role, $op) matches the rules', async ({ role, op }) => {
    const uid = ROLE_UIDS[role];
    const expected = can(role, op);
    const assertion = expected ? assertSucceeds : assertFails;

    await assertion(operationAction(op, uid)(dbOf(uid)));
  });
});

describe('firestore.rules — elements', () => {
  test('owner and editor can create an element', async () => {
    for (const uid of [ROLE_UIDS.owner, ROLE_UIDS.editor]) {
      await assertSucceeds(
        setDoc(
          doc(dbOf(uid), 'elements', `created-${uid}`),
          elementData(WS1, uid, `created-${uid}`),
        ),
      );
    }
  });

  test('a viewer, outsider or anonymous user cannot create an element', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'elements', 'created-viewer'),
        elementData(WS1, ROLE_UIDS.viewer, 'created-viewer'),
      ),
    );
    await assertFails(
      setDoc(
        doc(dbOf(OUTSIDER_UID), 'elements', 'created-outsider'),
        elementData(WS1, OUTSIDER_UID, 'created-outsider'),
      ),
    );
    await assertFails(
      setDoc(
        doc(unauthed().firestore(), 'elements', 'created-anon'),
        elementData(WS1, OUTSIDER_UID, 'created-anon'),
      ),
    );
  });

  test('a create cannot spoof another user in createdBy', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.editor), 'elements', 'spoofed'),
        elementData(WS1, ROLE_UIDS.owner, 'spoofed'),
      ),
    );
  });

  test('a user without membership cannot create an element in another workspace', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.owner), 'elements', 'cross-ws'),
        elementData(WS2, ROLE_UIDS.owner, 'cross-ws'),
      ),
    );
  });

  test('owner and editor can update an element', async () => {
    for (const uid of [ROLE_UIDS.owner, ROLE_UIDS.editor]) {
      await assertSucceeds(updateDoc(doc(dbOf(uid), 'elements', 'e1'), { updatedAt: now }));
    }
  });

  test('a viewer, outsider or anonymous user cannot update an element', async () => {
    await assertFails(updateDoc(doc(dbOf(ROLE_UIDS.viewer), 'elements', 'e1'), { updatedAt: now }));
    await assertFails(updateDoc(doc(dbOf(OUTSIDER_UID), 'elements', 'e1'), { updatedAt: now }));
    await assertFails(updateDoc(doc(unauthed().firestore(), 'elements', 'e1'), { updatedAt: now }));
  });

  test('an update cannot change the workspaceId of an element', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'elements', 'e1'), { workspaceId: WS2, updatedAt: now }),
    );
  });

  test('an update cannot rewrite who created an element', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'elements', 'e1'), {
        createdBy: ROLE_UIDS.viewer,
        updatedAt: now,
      }),
    );
  });

  test('an editor can update an element created by someone else without touching createdBy', async () => {
    await assertSucceeds(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'elements', 'e1'), {
        content: 'Edited by editor',
        updatedAt: now,
      }),
    );
  });

  test('an owner cannot update an element of a workspace they are not a member of', async () => {
    await assertFails(updateDoc(doc(dbOf(ROLE_UIDS.owner), 'elements', 'e2'), { updatedAt: now }));
  });

  test('owner and editor can delete an element', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'elements', 'del-owner'),
        elementData(WS1, ROLE_UIDS.owner, 'del-owner'),
      );
      await setDoc(
        doc(ctx.firestore(), 'elements', 'del-editor'),
        elementData(WS1, ROLE_UIDS.owner, 'del-editor'),
      );
    });
    await assertSucceeds(deleteDoc(doc(dbOf(ROLE_UIDS.owner), 'elements', 'del-owner')));
    await assertSucceeds(deleteDoc(doc(dbOf(ROLE_UIDS.editor), 'elements', 'del-editor')));
  });

  test('a viewer, outsider or anonymous user cannot delete an element', async () => {
    await assertFails(deleteDoc(doc(dbOf(ROLE_UIDS.viewer), 'elements', 'e1')));
    await assertFails(deleteDoc(doc(dbOf(OUTSIDER_UID), 'elements', 'e1')));
    await assertFails(deleteDoc(doc(unauthed().firestore(), 'elements', 'e1')));
  });

  test('members can read an element; outsiders, other workspaces and anonymous cannot', async () => {
    for (const uid of OTHER_ROLE_UIDS) {
      await assertSucceeds(getDoc(doc(dbOf(uid), 'elements', 'e1')));
    }
    await assertFails(getDoc(doc(dbOf(OUTSIDER_UID), 'elements', 'e1')));
    await assertFails(getDoc(doc(dbOf(ROLE_UIDS.owner), 'elements', 'e2')));
    await assertFails(getDoc(doc(unauthed().firestore(), 'elements', 'e1')));
  });
});

describe('firestore.rules — workspaces', () => {
  test('any authenticated user can read or create a workspace; anonymous cannot', async () => {
    for (const uid of [...OTHER_ROLE_UIDS, OUTSIDER_UID]) {
      await assertSucceeds(getDoc(doc(dbOf(uid), 'workspaces', WS1)));
      await assertSucceeds(
        setDoc(doc(dbOf(uid), 'workspaces', `new-${uid}`), workspaceData('New', uid)),
      );
    }
    await assertFails(getDoc(doc(unauthed().firestore(), 'workspaces', WS1)));
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'workspaces', 'new-anon'), workspaceData('New', 'anon')),
    );
  });

  test('a workspace create must set createdBy to the authenticated user', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(OUTSIDER_UID), 'workspaces', 'bad-owner'),
        workspaceData('Bad', ROLE_UIDS.owner),
      ),
    );
  });

  test('an authenticated user can create a workspace and immediately create their own owner membership', async () => {
    const db = dbOf(CREATOR_UID);
    await assertSucceeds(
      setDoc(doc(db, 'workspaces', NEW_WS), workspaceData('New workspace', CREATOR_UID)),
    );
    await assertSucceeds(
      setDoc(
        doc(db, 'memberships', `${NEW_WS}_${CREATOR_UID}`),
        membershipData(NEW_WS, CREATOR_UID, 'owner'),
      ),
    );
  });

  test('only the owner can update a workspace', async () => {
    await assertSucceeds(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'workspaces', WS1), { name: 'Renamed' }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'workspaces', WS1), { name: 'Renamed' }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.viewer), 'workspaces', WS1), { name: 'Renamed' }),
    );
    await assertFails(updateDoc(doc(dbOf(OUTSIDER_UID), 'workspaces', WS1), { name: 'Renamed' }));
    await assertFails(
      updateDoc(doc(unauthed().firestore(), 'workspaces', WS1), { name: 'Renamed' }),
    );
  });

  test('only the owner can delete a workspace', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', 'del-editor'), workspaceData());
      await setDoc(doc(ctx.firestore(), 'workspaces', 'del-viewer'), workspaceData());
      await setDoc(doc(ctx.firestore(), 'workspaces', 'del-outsider'), workspaceData());
      await setDoc(doc(ctx.firestore(), 'workspaces', 'del-anon'), workspaceData());
    });
    await assertSucceeds(deleteDoc(doc(dbOf(ROLE_UIDS.owner), 'workspaces', WS1)));
    await assertFails(deleteDoc(doc(dbOf(ROLE_UIDS.editor), 'workspaces', 'del-editor')));
    await assertFails(deleteDoc(doc(dbOf(ROLE_UIDS.viewer), 'workspaces', 'del-viewer')));
    await assertFails(deleteDoc(doc(dbOf(OUTSIDER_UID), 'workspaces', 'del-outsider')));
    await assertFails(deleteDoc(doc(unauthed().firestore(), 'workspaces', 'del-anon')));
  });
});

describe('firestore.rules — memberships', () => {
  test('a user can read their own membership', async () => {
    for (const uid of OTHER_ROLE_UIDS) {
      await assertSucceeds(getDoc(doc(dbOf(uid), 'memberships', `${WS1}_${uid}`)));
    }
  });

  test('members can read the roster of their workspace', async () => {
    await assertSucceeds(
      getDocs(
        query(collection(dbOf(ROLE_UIDS.owner), 'memberships'), where('workspaceId', '==', WS1)),
      ),
    );
  });

  test('an outsider or anonymous user cannot read memberships', async () => {
    await assertFails(getDoc(doc(dbOf(OUTSIDER_UID), 'memberships', `${WS1}_${ROLE_UIDS.viewer}`)));
    await assertFails(
      getDocs(
        query(collection(dbOf(OUTSIDER_UID), 'memberships'), where('workspaceId', '==', WS1)),
      ),
    );
    await assertFails(
      getDoc(doc(unauthed().firestore(), 'memberships', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
  });

  test('reading a non-existent membership returns null instead of denying', async () => {
    const snapshot = await getDoc(
      doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${OUTSIDER_UID}`),
    );
    expect(snapshot.exists()).toBe(false);
  });

  test('self-create of a membership is denied without a valid invitation', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'memberships', `${WS2}_${ROLE_UIDS.viewer}`),
        membershipData(WS2, ROLE_UIDS.viewer, 'editor'),
      ),
    );
  });

  test('the workspace creator can create their own owner membership', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'memberships', `${WS2}_${ROLE_UIDS.viewer}`),
        membershipData(WS2, ROLE_UIDS.viewer, 'owner'),
      ),
    );
  });

  test('self-create with a matching pending invitation succeeds', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-valid'),
        invitationData(WS1, ROLE_UIDS.owner, 'pending', INVITEE_EMAIL, 'editor', 'inv-valid'),
      );
    });

    await assertSucceeds(
      setDoc(
        doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'memberships', `${WS1}_${INVITEE_UID}`),
        membershipData(WS1, INVITEE_UID, 'editor', 'inv-valid'),
      ),
    );
  });

  test('self-create fails when the invitation role does not match', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-role-mismatch'),
        invitationData(
          WS1,
          ROLE_UIDS.owner,
          'pending',
          INVITEE_EMAIL,
          'editor',
          'inv-role-mismatch',
        ),
      );
    });

    await assertFails(
      setDoc(
        doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'memberships', `${WS1}_${INVITEE_UID}`),
        membershipData(WS1, INVITEE_UID, 'owner', 'inv-role-mismatch'),
      ),
    );
  });

  test('self-create fails when the invitation email does not match', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-email-mismatch'),
        invitationData(
          WS1,
          ROLE_UIDS.owner,
          'pending',
          INVITEE_EMAIL,
          'editor',
          'inv-email-mismatch',
        ),
      );
    });

    await assertFails(
      setDoc(
        doc(dbWithEmail(INVITEE_UID, OTHER_EMAIL), 'memberships', `${WS1}_${INVITEE_UID}`),
        membershipData(WS1, INVITEE_UID, 'editor', 'inv-email-mismatch'),
      ),
    );
  });

  test('self-create fails when the invitation is expired', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitations', 'inv-expired'), {
        ...invitationData(WS1, ROLE_UIDS.owner, 'pending', INVITEE_EMAIL, 'editor', 'inv-expired'),
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    await assertFails(
      setDoc(
        doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'memberships', `${WS1}_${INVITEE_UID}`),
        membershipData(WS1, INVITEE_UID, 'editor', 'inv-expired'),
      ),
    );
  });

  test('self-create fails when the invitation is not pending', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-accepted'),
        invitationData(WS1, ROLE_UIDS.owner, 'accepted', INVITEE_EMAIL, 'editor', 'inv-accepted'),
      );
    });

    await assertFails(
      setDoc(
        doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'memberships', `${WS1}_${INVITEE_UID}`),
        membershipData(WS1, INVITEE_UID, 'editor', 'inv-accepted'),
      ),
    );
  });

  test('an owner cannot add another member directly; memberships require an invitation', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${OUTSIDER_UID}`),
        membershipData(WS1, OUTSIDER_UID, 'viewer'),
      ),
    );
  });

  test('an editor or viewer cannot add another member or spoof a userId', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.editor), 'memberships', `${WS1}_${OUTSIDER_UID}`),
        membershipData(WS1, OUTSIDER_UID, 'viewer'),
      ),
    );
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'memberships', `${WS1}_${OUTSIDER_UID}`),
        membershipData(WS1, OUTSIDER_UID, 'viewer'),
      ),
    );
  });

  test('an anonymous user cannot create a membership', async () => {
    await assertFails(
      setDoc(
        doc(unauthed().firestore(), 'memberships', `${WS1}_${OUTSIDER_UID}`),
        membershipData(WS1, OUTSIDER_UID, 'viewer'),
      ),
    );
  });

  test('only the owner can change a role', async () => {
    await assertSucceeds(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${VICTIM_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'memberships', `${WS1}_${VICTIM_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.viewer), 'memberships', `${WS1}_${VICTIM_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(OUTSIDER_UID), 'memberships', `${WS1}_${VICTIM_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(unauthed().firestore(), 'memberships', `${WS1}_${VICTIM_UID}`), {
        role: 'editor',
        updatedAt: now,
      }),
    );
  });

  test('an owner role change cannot rewrite the membership identity', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${VICTIM_UID}`), {
        userId: ROLE_UIDS.editor,
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${VICTIM_UID}`), {
        workspaceId: WS2,
        updatedAt: now,
      }),
    );
  });

  test('only the owner can remove another member', async () => {
    await assertFails(
      deleteDoc(doc(dbOf(ROLE_UIDS.editor), 'memberships', `${WS1}_${VICTIM_UID}`)),
    );
    await assertFails(
      deleteDoc(doc(dbOf(ROLE_UIDS.viewer), 'memberships', `${WS1}_${VICTIM_UID}`)),
    );
    await assertFails(deleteDoc(doc(dbOf(OUTSIDER_UID), 'memberships', `${WS1}_${VICTIM_UID}`)));
    await assertSucceeds(
      deleteDoc(doc(dbOf(ROLE_UIDS.owner), 'memberships', `${WS1}_${VICTIM_UID}`)),
    );
  });

  test('a member can leave but cannot remove another member nor be anonymous', async () => {
    for (const uid of OTHER_ROLE_UIDS) {
      await assertSucceeds(deleteDoc(doc(dbOf(uid), 'memberships', `${WS1}_${uid}`)));
    }
    await assertFails(
      deleteDoc(doc(unauthed().firestore(), 'memberships', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
  });
});

describe('firestore.rules — invitations', () => {
  test('any authenticated user can read an invitation; anonymous cannot', async () => {
    for (const uid of [...OTHER_ROLE_UIDS, OUTSIDER_UID]) {
      await assertSucceeds(getDoc(doc(dbOf(uid), 'invitations', 'inv1')));
    }
    await assertFails(getDoc(doc(unauthed().firestore(), 'invitations', 'inv1')));
  });

  test('owner and editor can invite; a viewer or anonymous user cannot', async () => {
    for (const uid of [ROLE_UIDS.owner, ROLE_UIDS.editor]) {
      await assertSucceeds(
        setDoc(doc(dbOf(uid), 'invitations', `inv-${uid}`), invitationData(WS1, uid)),
      );
    }
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'invitations', 'inv-viewer'),
        invitationData(WS1, ROLE_UIDS.viewer),
      ),
    );
    await assertFails(
      setDoc(
        doc(unauthed().firestore(), 'invitations', 'inv-anon'),
        invitationData(WS1, ROLE_UIDS.owner),
      ),
    );
  });

  test('an owner can invite with owner role', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv-owner-role'),
        invitationData(WS1, ROLE_UIDS.owner, 'pending', INVITEE_EMAIL, 'owner', 'inv-owner-role'),
      ),
    );
  });

  test('an editor cannot invite with owner role', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.editor), 'invitations', 'inv-editor-owner'),
        invitationData(
          WS1,
          ROLE_UIDS.editor,
          'pending',
          INVITEE_EMAIL,
          'owner',
          'inv-editor-owner',
        ),
      ),
    );
  });

  test('an invitation flags invitedBy === auth.uid', async () => {
    await assertFails(
      setDoc(doc(dbOf(ROLE_UIDS.editor), 'invitations', 'inv-spoofed'), {
        ...invitationData(WS1, ROLE_UIDS.owner),
        invitedBy: ROLE_UIDS.owner,
      }),
    );
  });

  test('an owner or editor can update an invitation', async () => {
    await assertSucceeds(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv1'), {
        status: 'revoked',
        updatedAt: now,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'invitations', 'inv1'), {
        status: 'revoked',
        updatedAt: now,
      }),
    );
  });

  test('a viewer, outsider or anonymous user cannot update an invitation', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.viewer), 'invitations', 'inv1'), {
        status: 'revoked',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(OUTSIDER_UID), 'invitations', 'inv1'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(unauthed().firestore(), 'invitations', 'inv1'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });

  test('an owner cannot turn their invitation into an invitation of another workspace', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv1'), {
        workspaceId: WS2,
        email: 'attacker@example.com',
        role: 'owner',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.editor), 'invitations', 'inv1'), {
        workspaceId: WS2,
        updatedAt: now,
      }),
    );
  });

  test('an owner cannot rewrite the identity fields of an invitation in their own workspace', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv1'), {
        tokenHash: 'ff'.repeat(32),
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv1'), {
        invitedBy: ROLE_UIDS.editor,
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'invitations', 'inv1'), {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: now,
      }),
    );
  });

  test('the invitee whose email matches can accept a pending invitation', async () => {
    await assertSucceeds(
      updateDoc(doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'invitations', 'inv1'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });

  test('a pending invitation cannot be accepted by a non-matching email', async () => {
    await assertFails(
      updateDoc(doc(dbWithEmail('other-user', OTHER_EMAIL), 'invitations', 'inv1'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });

  test('the invitee cannot tamper with fields other than status/updatedAt', async () => {
    await assertFails(
      updateDoc(doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'invitations', 'inv1'), {
        role: 'owner',
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });

  test('the invitee cannot accept an invitation that is not pending', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-revoked'),
        invitationData(WS1, ROLE_UIDS.owner, 'revoked'),
      );
      await setDoc(
        doc(ctx.firestore(), 'invitations', 'inv-accepted'),
        invitationData(WS1, ROLE_UIDS.owner, 'accepted'),
      );
    });
    await assertFails(
      updateDoc(doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'invitations', 'inv-revoked'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
    await assertFails(
      updateDoc(doc(dbWithEmail(INVITEE_UID, INVITEE_EMAIL), 'invitations', 'inv-accepted'), {
        status: 'accepted',
        updatedAt: now,
      }),
    );
  });
});

describe('firestore.rules — presence', () => {
  test('a member can announce and withdraw their own presence', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'presence', `${WS1}_${ROLE_UIDS.viewer}`),
        presenceData(WS1, ROLE_UIDS.viewer),
      ),
    );
    await assertSucceeds(
      deleteDoc(doc(dbOf(ROLE_UIDS.viewer), 'presence', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
  });

  test('a user can only write their own presence', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.viewer), 'presence', `${WS1}_${ROLE_UIDS.owner}`),
        presenceData(WS1, ROLE_UIDS.owner),
      ),
    );
  });

  test('a non-member cannot write presence in a workspace', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(OUTSIDER_UID), 'presence', `${WS1}_${OUTSIDER_UID}`),
        presenceData(WS1, OUTSIDER_UID),
      ),
    );
  });

  test('a member cannot delete or update another user presence', async () => {
    await assertFails(
      updateDoc(doc(dbOf(ROLE_UIDS.owner), 'presence', `${WS1}_${ROLE_UIDS.viewer}`), {
        lastSeenAt: now,
      }),
    );
    await assertFails(
      deleteDoc(doc(dbOf(ROLE_UIDS.owner), 'presence', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
  });

  test('members can read presence; outsiders and anonymous cannot', async () => {
    await assertSucceeds(
      getDoc(doc(dbOf(ROLE_UIDS.viewer), 'presence', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
    await assertFails(getDoc(doc(dbOf(OUTSIDER_UID), 'presence', `${WS1}_${ROLE_UIDS.viewer}`)));
    await assertFails(
      getDoc(doc(unauthed().firestore(), 'presence', `${WS1}_${ROLE_UIDS.viewer}`)),
    );
  });
});

function userSettingsData(userId: string, theme = 'dark') {
  return {
    userId,
    theme,
    fontSize: 'base',
    locale: 'system',
    reducedMotion: false,
    version: 1,
    updatedAt: now,
  };
}

describe('firestore.rules — user_settings', () => {
  test('a user can create, read and update their own settings', async () => {
    const db = dbOf(ROLE_UIDS.owner);
    await assertSucceeds(
      setDoc(doc(db, 'user_settings', ROLE_UIDS.owner), userSettingsData(ROLE_UIDS.owner)),
    );
    await assertSucceeds(getDoc(doc(db, 'user_settings', ROLE_UIDS.owner)));
    await assertSucceeds(
      updateDoc(doc(db, 'user_settings', ROLE_UIDS.owner), { theme: 'light', version: 2 }),
    );
  });

  test('a user cannot read or write another user settings', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'user_settings', ROLE_UIDS.viewer),
        userSettingsData(ROLE_UIDS.viewer),
      );
    });

    await assertFails(getDoc(doc(dbOf(ROLE_UIDS.owner), 'user_settings', ROLE_UIDS.viewer)));
    await assertFails(
      setDoc(
        doc(dbOf(ROLE_UIDS.owner), 'user_settings', ROLE_UIDS.viewer),
        userSettingsData(ROLE_UIDS.viewer),
      ),
    );
  });

  test('a user cannot spoof the userId field of their own settings doc', async () => {
    await assertFails(
      setDoc(doc(dbOf(ROLE_UIDS.owner), 'user_settings', ROLE_UIDS.owner), {
        ...userSettingsData(ROLE_UIDS.owner),
        userId: ROLE_UIDS.viewer,
      }),
    );
  });

  test('anonymous users cannot read or write settings', async () => {
    const db = unauthed().firestore();
    await assertFails(getDoc(doc(db, 'user_settings', ROLE_UIDS.owner)));
    await assertFails(
      setDoc(doc(db, 'user_settings', ROLE_UIDS.owner), userSettingsData(ROLE_UIDS.owner)),
    );
  });
});
