import { toAppError, type AppError } from '../../shared/errors';
import type { AuthPort, AuthUser } from '../ports';

export type RefreshUserResult =
  | { readonly status: 'ok'; readonly user: AuthUser }
  | { readonly status: 'error'; readonly error: AppError };

export type RefreshUser = () => Promise<RefreshUserResult>;

export function createRefreshUser(authPort: AuthPort): RefreshUser {
  return async (): Promise<RefreshUserResult> => {
    try {
      const user = await authPort.refreshUser();
      return { status: 'ok', user };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
