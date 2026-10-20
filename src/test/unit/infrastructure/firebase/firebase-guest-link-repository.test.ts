import type { Firestore } from 'firebase/firestore';
import { GuestLink } from '../../../../domain/guest-link';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromGuestLinkDocument,
  toGuestLinkDocument,
} from '../../../../infrastructure/firebase/firebase-guest-link-mapper';
import { createFirebaseGuestLinkRepository } from '../../../../infrastructure/firebase/firebase-guest-link-repository';
import type { InMemoryFirestoreApi } from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const NOW = new Date('2026-10-20T10:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function makeLink(tokenHash = HASH_A): GuestLink {
  return GuestLink.create({
    tokenHash,
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    createdAt: NOW,
  });
}

describe('guest link mapper', () => {
  it('round-trips the document without storing the token', () => {
    const link = makeLink();
    const document = toGuestLinkDocument(link);
    const parsed = fromGuestLinkDocument(HASH_A, document);

    expect(document).toEqual({
      workspaceId: 'ws-1',
      role: 'viewer',
      createdBy: 'user-1',
      createdAt: NOW,
      updatedAt: NOW,
      revokedAt: null,
    });
    expect(document).not.toHaveProperty('token');
    expect(parsed.tokenHash).toBe(HASH_A);
    expect(parsed.isActive()).toBe(true);
  });

  it('reads a revoked link and rejects malformed documents', () => {
    const revoked = makeLink().revoke(new Date(NOW.getTime() + 60_000));
    expect(fromGuestLinkDocument(HASH_A, toGuestLinkDocument(revoked)).revokedAt).toEqual(
      revoked.revokedAt,
    );

    expect(() => fromGuestLinkDocument(HASH_A, { role: 'editor' })).toThrow(
      'Guest link document field "role" must be "viewer"',
    );
    expect(() => fromGuestLinkDocument(HASH_A, { role: 'viewer' })).toThrow(
      'Guest link document field "workspaceId" must be a string',
    );
  });
});

describe('createFirebaseGuestLinkRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  it('creates, finds and lists active links by workspace', async () => {
    const repository = createFirebaseGuestLinkRepository(makeFirestore());
    const link = makeLink();

    await repository.create(link);

    expect(firestoreMock.__read(`guest_links/${HASH_A}`)).toMatchObject({
      workspaceId: 'ws-1',
      role: 'viewer',
      revokedAt: null,
    });
    expect((await repository.findByTokenHash(HASH_A))?.tokenHash).toBe(HASH_A);
    expect(await repository.findByTokenHash(HASH_B)).toBeNull();
    expect(await repository.listActiveByWorkspace(WorkspaceId.create('ws-1'))).toHaveLength(1);
    expect(await repository.listActiveByWorkspace(WorkspaceId.create('ws-2'))).toHaveLength(0);
  });

  it('revokes a link and removes it from the active list', async () => {
    const repository = createFirebaseGuestLinkRepository(makeFirestore());
    await repository.create(makeLink());

    const revoked = await repository.revoke(HASH_A);

    expect(revoked.isActive()).toBe(false);
    expect(await repository.listActiveByWorkspace(WorkspaceId.create('ws-1'))).toHaveLength(0);
    expect((await repository.revoke(HASH_A)).isActive()).toBe(false);
  });

  it('stores guest sessions keyed by user id', async () => {
    const repository = createFirebaseGuestLinkRepository(makeFirestore());

    await repository.openSession({
      userId: UserId.create('guest-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      tokenHash: HASH_A,
    });

    expect(firestoreMock.__read('guest_sessions/guest-1')).toMatchObject({
      userId: 'guest-1',
      workspaceId: 'ws-1',
      tokenHash: HASH_A,
    });
  });

  it('maps permission errors to AppError and rejects duplicate tokens', async () => {
    const repository = createFirebaseGuestLinkRepository(makeFirestore());
    await repository.create(makeLink());

    await expect(repository.create(makeLink())).rejects.toMatchObject({
      kind: 'conflict',
    });

    firestoreMock.__failNextWith('permission-denied');
    await expect(repository.findByTokenHash(HASH_A)).rejects.toMatchObject({
      kind: 'authorization',
    });
  });
});
