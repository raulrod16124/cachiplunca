import {
  createCreateGuestLink,
  createOpenGuestWorkspace,
  createRevokeGuestLink,
} from '../../application/commands';
import {
  createGetWorkspace,
  createListActiveGuestLinks,
  createLoadWorkspaceElements,
} from '../../application/queries';
import type { GuestLinkServices } from '../../application/guest-link-services';

export type { GuestLinkServices } from '../../application/guest-link-services';
import type { AuthUser, GuestLinkRepository } from '../../application/ports';
import { createFirebaseElementRepository } from '../../infrastructure/firebase/firebase-element-repository';
import { createFirebaseGuestLinkRepository } from '../../infrastructure/firebase/firebase-guest-link-repository';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';
import { createFirebaseWorkspaceRepository } from '../../infrastructure/firebase/firebase-workspace-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';
import {
  createGuestLinkTokenIssuer,
  hashGuestLinkToken,
} from '../../infrastructure/crypto/guest-link-token';

export interface GuestLinkServicesDeps {
  readonly signInAnonymously: () => Promise<AuthUser>;
}

export function createGuestLinkServices(deps: GuestLinkServicesDeps): GuestLinkServices {
  const db = getFirebaseFirestore();
  const guestLinkRepository: GuestLinkRepository = createFirebaseGuestLinkRepository(db);
  const membershipRepository = createFirebaseMembershipRepository(db);
  const elementRepository = createFirebaseElementRepository(db);

  return {
    createGuestLink: createCreateGuestLink({
      guestLinkRepository,
      membershipRepository,
      issueToken: createGuestLinkTokenIssuer(),
    }),
    revokeGuestLink: createRevokeGuestLink({ guestLinkRepository, membershipRepository }),
    listActiveGuestLinks: createListActiveGuestLinks({
      guestLinkRepository,
      membershipRepository,
    }),
    openGuestWorkspace: createOpenGuestWorkspace({
      guestLinkRepository,
      hashToken: hashGuestLinkToken,
      signInAnonymously: deps.signInAnonymously,
      getWorkspace: createGetWorkspace(createFirebaseWorkspaceRepository(db)),
      loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
    }),
  };
}
