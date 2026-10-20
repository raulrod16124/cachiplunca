import type { CreateGuestLink, OpenGuestWorkspace, RevokeGuestLink } from './commands';
import type { ListActiveGuestLinks } from './queries';

export interface GuestLinkServices {
  readonly createGuestLink: CreateGuestLink;
  readonly revokeGuestLink: RevokeGuestLink;
  readonly listActiveGuestLinks: ListActiveGuestLinks;
  readonly openGuestWorkspace: OpenGuestWorkspace;
}
