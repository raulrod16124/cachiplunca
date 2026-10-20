import {
  createListPendingInvitations,
  sortPendingInvitations,
} from '../../../../application/queries';
import type { InvitationRepository } from '../../../../application/ports';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeInvitationRepository } from '../../../fixtures/fake-invitation-repository';

const WORKSPACE = WorkspaceId.create('ws-1');

function buildInvitation(
  id: string,
  createdAt: Date,
  overrides: Partial<Parameters<typeof Invitation.create>[0]> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create(id),
    workspaceId: WORKSPACE,
    email: `${id}@example.com`,
    role: 'editor',
    tokenHash: `hash-${id}`,
    invitedBy: UserId.create('user-1'),
    expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });
}

describe('sortPendingInvitations', () => {
  it('orders invitations by most recently created first', () => {
    const older = buildInvitation('inv-a', new Date('2026-01-01T00:00:00.000Z'));
    const newer = buildInvitation('inv-b', new Date('2026-02-01T00:00:00.000Z'));

    const sorted = sortPendingInvitations([older, newer]);

    expect(sorted.map((invitation) => invitation.id.value)).toEqual(['inv-b', 'inv-a']);
  });

  it('breaks createdAt ties by id so the order is deterministic', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const first = buildInvitation('inv-a', createdAt);
    const second = buildInvitation('inv-b', createdAt);

    expect(
      sortPendingInvitations([second, first]).map((invitation) => invitation.id.value),
    ).toEqual(['inv-a', 'inv-b']);
  });
});

describe('createListPendingInvitations', () => {
  it('returns the pending invitations of the workspace sorted', async () => {
    const repository = new FakeInvitationRepository();
    await repository.create(buildInvitation('inv-a', new Date('2026-01-01T00:00:00.000Z')));
    await repository.create(buildInvitation('inv-b', new Date('2026-02-01T00:00:00.000Z')));
    const listPendingInvitations = createListPendingInvitations(repository);

    const result = await listPendingInvitations('ws-1');

    if (result.status !== 'ok') {
      throw new Error(`Expected ok, received ${result.status}`);
    }
    expect(result.invitations.map((invitation) => invitation.id.value)).toEqual(['inv-b', 'inv-a']);
  });

  it('returns an empty list when there are no pending invitations', async () => {
    const listPendingInvitations = createListPendingInvitations(new FakeInvitationRepository());

    await expect(listPendingInvitations('ws-1')).resolves.toEqual({
      status: 'ok',
      invitations: [],
    });
  });

  it('isolates pending invitations by workspace', async () => {
    const repository = new FakeInvitationRepository();
    await repository.create(buildInvitation('inv-a', new Date('2026-01-01T00:00:00.000Z')));
    await repository.create(
      buildInvitation('inv-b', new Date('2026-01-01T00:00:00.000Z'), {
        workspaceId: WorkspaceId.create('ws-2'),
      }),
    );
    const listPendingInvitations = createListPendingInvitations(repository);

    const result = await listPendingInvitations('ws-1');

    if (result.status !== 'ok') {
      throw new Error(`Expected ok, received ${result.status}`);
    }
    expect(result.invitations.map((invitation) => invitation.id.value)).toEqual(['inv-a']);
  });

  it('translates repository failures into an AppError result', async () => {
    const error = createAppError(
      'network',
      ERROR_CODES.NETWORK_REQUEST_FAILED,
      'The network connection was lost.',
    );
    const repository: InvitationRepository = {
      create: async () => {
        throw new Error('not used');
      },
      findById: async () => null,
      findByTokenHash: async () => null,
      listPendingByWorkspace: async () => {
        throw error;
      },
      listPendingByEmail: async () => [],
      watchPendingByEmail: () => () => undefined,
      updateStatus: async () => {
        throw new Error('not used');
      },
    };
    const listPendingInvitations = createListPendingInvitations(repository);

    await expect(listPendingInvitations('ws-1')).resolves.toEqual({ status: 'error', error });
  });
});
