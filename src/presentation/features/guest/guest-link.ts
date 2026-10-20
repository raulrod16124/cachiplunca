import { getPublicBasePath } from '../../config/public-base';

export const GUEST_VIEW_PATH = '/view';

export function buildGuestViewLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  const basePath = getPublicBasePath();
  const path = basePath === '/' ? GUEST_VIEW_PATH : `${basePath}${GUEST_VIEW_PATH}`;
  return `${base}${path}/${token}`;
}
