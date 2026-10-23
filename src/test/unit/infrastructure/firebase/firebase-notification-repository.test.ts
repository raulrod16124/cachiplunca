import type { Firestore } from 'firebase/firestore';
import { Notification } from '../../../../domain/notification';
import {
  CommentId,
  ElementId,
  NotificationId,
  UserId,
  WorkspaceId,
} from '../../../../domain/shared';
import { createFirebaseNotificationRepository } from '../../../../infrastructure/firebase/firebase-notification-repository';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeNotificationRepositoryContract } from '../../../contract/notification-repository-contract';
import type { InMemoryFirestoreApi } from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');

const RECIPIENT = UserId.create('user-2');
const CREATED_AT = new Date('2026-10-23T10:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function makeNotification(id = 'notification-1'): Notification {
  return Notification.create({
    id: NotificationId.create(id),
    type: 'comment',
    recipientId: RECIPIENT,
    workspaceId: WorkspaceId.create('ws-1'),
    workspaceName: 'Roadmap',
    elementId: ElementId.create('el-1'),
    commentId: CommentId.create('comment-1'),
    actorId: UserId.create('user-1'),
    actorName: 'Ada',
    bodyPreview: 'Looks good',
    createdAt: CREATED_AT,
  });
}

describe('createFirebaseNotificationRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeNotificationRepositoryContract('notification repository contract', () =>
    createFirebaseNotificationRepository(makeFirestore()),
  );

  it('persists notifications in the top-level collection', async () => {
    const repository = createFirebaseNotificationRepository(makeFirestore());

    await repository.create(makeNotification());

    expect(firestoreMock.__paths()).toEqual(['notifications/notification-1']);
    expect(firestoreMock.__read('notifications/notification-1')).toMatchObject({
      id: 'notification-1',
      type: 'comment',
      recipientId: 'user-2',
      workspaceId: 'ws-1',
      workspaceName: 'Roadmap',
      elementId: 'el-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      actorName: 'Ada',
      bodyPreview: 'Looks good',
      createdAt: CREATED_AT,
    });
  });

  it('writes batches through writeBatch', async () => {
    const repository = createFirebaseNotificationRepository(makeFirestore());

    await repository.createMany([makeNotification('one'), makeNotification('two')]);

    expect(firestoreMock.__paths().sort()).toEqual(['notifications/one', 'notifications/two']);
  });

  it('reads back Timestamp-like dates stored in Firestore', async () => {
    firestoreMock.__seed('notifications/notification-1', {
      id: 'notification-1',
      type: 'comment',
      recipientId: 'user-2',
      workspaceId: 'ws-1',
      workspaceName: 'Roadmap',
      elementId: 'el-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      actorName: 'Ada',
      bodyPreview: 'Looks good',
      createdAt: { toDate: () => CREATED_AT },
    });
    const repository = createFirebaseNotificationRepository(makeFirestore());

    const notification = await repository.findById(NotificationId.create('notification-1'));

    expect(notification?.createdAt).toEqual(CREATED_AT);
  });

  it('maps storage failures to AppErrors', async () => {
    const repository = createFirebaseNotificationRepository(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    const error: unknown = await repository
      .listByRecipient(RECIPIENT)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('maps permission failures to authorization AppErrors', async () => {
    const repository = createFirebaseNotificationRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository
      .create(makeNotification())
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
  });
});
