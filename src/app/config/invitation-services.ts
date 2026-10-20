import {
  createAcceptInvitation,
  createAcceptInvitationById,
  createInviteMember,
  type AcceptInvitation,
  type AcceptInvitationById,
  type InviteMember,
} from '../../application/commands';
import {
  createListPendingInvitations,
  createListPendingInvitationsForUser,
  createWatchPendingInvitationsForUser,
  type ListPendingInvitations,
  type ListPendingInvitationsForUser,
  type WatchPendingInvitationsForUser,
} from '../../application/queries';
import type { InvitationRepository, MembershipRepository } from '../../application/ports';
import { InvitationId } from '../../domain/shared';
import {
  createInvitationTokenIssuer,
  hashInvitationToken,
} from '../../infrastructure/crypto/invitation-token';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseInvitationRepository } from '../../infrastructure/firebase/firebase-invitation-repository';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';

export interface InvitationServices {
  readonly inviteMember: InviteMember;
  readonly listPendingInvitations: ListPendingInvitations;
  readonly listPendingInvitationsForUser: ListPendingInvitationsForUser;
  readonly watchPendingInvitationsForUser: WatchPendingInvitationsForUser;
  readonly acceptInvitation: AcceptInvitation;
  readonly acceptInvitationById: AcceptInvitationById;
}

export function createInvitationServices(): InvitationServices {
  const db = getFirebaseFirestore();
  const invitationRepository: InvitationRepository = createFirebaseInvitationRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);
  return {
    inviteMember: createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create(crypto.randomUUID()),
      issueToken: createInvitationTokenIssuer(),
    }),
    listPendingInvitations: createListPendingInvitations(invitationRepository),
    listPendingInvitationsForUser: createListPendingInvitationsForUser(invitationRepository),
    watchPendingInvitationsForUser: createWatchPendingInvitationsForUser(invitationRepository),
    acceptInvitation: createAcceptInvitation({
      invitationRepository,
      membershipRepository,
      hashToken: hashInvitationToken,
    }),
    acceptInvitationById: createAcceptInvitationById({
      invitationRepository,
      membershipRepository,
    }),
  };
}
