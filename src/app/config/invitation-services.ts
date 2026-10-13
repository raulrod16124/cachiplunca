import {
  createAcceptInvitation,
  createInviteMember,
  type AcceptInvitation,
  type InviteMember,
} from '../../application/commands';
import {
  createListPendingInvitations,
  type ListPendingInvitations,
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
  readonly acceptInvitation: AcceptInvitation;
}

export function createInvitationServices(): InvitationServices {
  const db = getFirebaseFirestore();
  const invitationRepository: InvitationRepository = createFirebaseInvitationRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);
  return {
    inviteMember: createInviteMember({
      invitationRepository,
      generateId: () => InvitationId.create(crypto.randomUUID()),
      issueToken: createInvitationTokenIssuer(),
    }),
    listPendingInvitations: createListPendingInvitations(invitationRepository),
    acceptInvitation: createAcceptInvitation({
      invitationRepository,
      membershipRepository,
      hashToken: hashInvitationToken,
    }),
  };
}
