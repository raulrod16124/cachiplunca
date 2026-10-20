import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref as storageRef, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MembershipRole } from '../../domain/membership/role';

const PROJECT_ID = 'demo-cachiplunca';
const STORAGE_RULES_PATH = resolve(__dirname, '../../../storage.rules');

const WS1 = 'ws1';
const WS2 = 'ws2';
const ROLES: readonly MembershipRole[] = ['owner', 'editor', 'viewer'];
const ROLE_UIDS: Readonly<Record<MembershipRole, string>> = {
  owner: 'owner-user',
  editor: 'editor-user',
  viewer: 'viewer-user',
};
const OUTSIDER_UID = 'outsider-user';
const GUEST_UID = 'guest-user';
const GUEST_TOKEN_HASH = 'a'.repeat(64);
const now = new Date('2026-10-20T00:00:00.000Z');
const MAX_SIZE = 5 * 1024 * 1024;

let testEnv: RulesTestEnvironment;

function membershipData(workspaceId: string, userId: string, role: MembershipRole) {
  return { userId, workspaceId, role, createdAt: now, updatedAt: now };
}

function imagePath(workspaceId: string, imageId = 'image-1') {
  return `workspaces/${workspaceId}/images/${imageId}.png`;
}

function bytes(size = 8): Uint8Array {
  return new Uint8Array(size);
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(STORAGE_RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'workspaces', WS1), { name: 'Workspace', createdBy: ROLE_UIDS.owner });
    await setDoc(doc(db, 'workspaces', WS2), { name: 'Second', createdBy: ROLE_UIDS.owner });
    for (const role of ROLES) {
      await setDoc(
        doc(db, 'memberships', `${WS1}_${ROLE_UIDS[role]}`),
        membershipData(WS1, ROLE_UIDS[role], role),
      );
    }
    await setDoc(doc(db, 'guest_links', GUEST_TOKEN_HASH), {
      workspaceId: WS1,
      role: 'viewer',
      createdBy: ROLE_UIDS.owner,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    });
    await setDoc(doc(db, 'guest_sessions', GUEST_UID), {
      userId: GUEST_UID,
      workspaceId: WS1,
      tokenHash: GUEST_TOKEN_HASH,
      createdAt: now,
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function storageFor(uid: string) {
  return testEnv.authenticatedContext(uid).storage();
}

function anonymousStorage() {
  return testEnv.unauthenticatedContext().storage();
}

function guestStorage(uid = GUEST_UID) {
  return testEnv
    .authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } })
    .storage();
}

async function upload(uid: string, path = imagePath(WS1), contentType = 'image/png') {
  const storage = storageFor(uid);
  return uploadBytes(storageRef(storage, path), bytes(), { contentType });
}

describe('storage.rules — images', () => {
  test('owner and editor can upload valid images', async () => {
    for (const role of ['owner', 'editor'] as const) {
      await assertSucceeds(upload(ROLE_UIDS[role], imagePath(WS1, `image-${role}`)));
    }
  });

  test('viewers, outsiders and anonymous users cannot upload', async () => {
    await assertFails(upload(ROLE_UIDS.viewer, imagePath(WS1, 'image-viewer')));
    await assertFails(upload(OUTSIDER_UID, imagePath(WS1, 'image-outsider')));
    await assertFails(
      uploadBytes(storageRef(anonymousStorage(), imagePath(WS1, 'image-anon')), bytes(), {
        contentType: 'image/png',
      }),
    );
  });

  test('rejects unsupported content types and empty or oversized files', async () => {
    await assertFails(upload(ROLE_UIDS.editor, imagePath(WS1, 'image-pdf'), 'application/pdf'));
    await assertFails(
      uploadBytes(
        storageRef(storageFor(ROLE_UIDS.editor), imagePath(WS1, 'image-empty')),
        bytes(0),
        {
          contentType: 'image/png',
        },
      ),
    );
    await assertFails(
      uploadBytes(
        storageRef(storageFor(ROLE_UIDS.editor), imagePath(WS1, 'image-large')),
        bytes(MAX_SIZE + 1),
        { contentType: 'image/png' },
      ),
    );
  });

  test('members can read images; outsiders and anonymous users cannot', async () => {
    const path = imagePath(WS1, 'image-read');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(storageRef(context.storage(), path), bytes(), {
        contentType: 'image/png',
      });
    });

    for (const role of ROLES) {
      await assertSucceeds(getBytes(storageRef(storageFor(ROLE_UIDS[role]), path)));
    }
    await assertFails(getBytes(storageRef(storageFor(OUTSIDER_UID), path)));
    await assertFails(getBytes(storageRef(anonymousStorage(), path)));
  });

  test('only owner and editor can delete images', async () => {
    const path = imagePath(WS1, 'image-delete');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(storageRef(context.storage(), path), bytes(), {
        contentType: 'image/png',
      });
    });

    await assertFails(deleteObject(storageRef(storageFor(ROLE_UIDS.viewer), path)));
    await assertSucceeds(deleteObject(storageRef(storageFor(ROLE_UIDS.editor), path)));
  });

  test('does not allow writing outside a workspace image path', async () => {
    await assertFails(
      uploadBytes(
        storageRef(storageFor(ROLE_UIDS.owner), 'workspaces/ws1/other/file.png'),
        bytes(),
        {
          contentType: 'image/png',
        },
      ),
    );
  });
  test('a guest with a valid link can read images, but loses access when revoked', async () => {
    const path = imagePath(WS1, 'image-guest');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(storageRef(context.storage(), path), bytes(), {
        contentType: 'image/png',
      });
    });

    await assertSucceeds(getBytes(storageRef(guestStorage(), path)));
    await assertFails(getBytes(storageRef(guestStorage('other-guest-user'), path)));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'guest_links', GUEST_TOKEN_HASH), {
        workspaceId: WS1,
        role: 'viewer',
        createdBy: ROLE_UIDS.owner,
        createdAt: now,
        updatedAt: new Date(now.getTime() + 60_000),
        revokedAt: new Date(now.getTime() + 60_000),
      });
    });

    await assertFails(getBytes(storageRef(guestStorage(), path)));
  });
});
