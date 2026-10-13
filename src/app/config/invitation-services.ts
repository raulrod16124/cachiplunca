import { createInviteMember, type InviteMember } from '../../application/commands';
import {
  createListPendingInvitations,
  type ListPendingInvitations,
} from '../../application/queries';
import type { InvitationRepository } from '../../application/ports';
import { InvitationId } from '../../domain/shared';
import { createInvitationTokenIssuer } from '../../infrastructure/crypto/invitation-token';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';
import { createFirebaseInvitationRepository } from '../../infrastructure/firebase/firebase-invitation-repository';

export interface InvitationServices {
  readonly inviteMember: InviteMember;
  readonly listPendingInvitations: ListPendingInvitations;
}

export function createInvitationServices(): InvitationServices {
  const db = getFirebaseFirestore();
  const invitationRepository: InvitationRepository = createFirebaseInvitationRepository(db);
  return {
    inviteMember: createInviteMember({
      invitationRepository,
      generateId: () => InvitationId.create(crypto.randomUUID()),
      issueToken: createInvitationTokenIssuer(),
    }),
    listPendingInvitations: createListPendingInvitations(invitationRepository),
  };
}
