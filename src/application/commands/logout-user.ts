import { toAppError, type AppError } from '../../shared/errors';
import type { AuthPort } from '../ports';

export type LogoutUserResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export type LogoutUser = () => Promise<LogoutUserResult>;

export function createLogoutUser(authPort: AuthPort): LogoutUser {
  return async (): Promise<LogoutUserResult> => {
    try {
      await authPort.signOut();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
