import { toAppError, type AppError } from '../../shared/errors';
import type { AuthPort } from '../ports';

export type SendEmailVerificationResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export type SendEmailVerification = () => Promise<SendEmailVerificationResult>;

export function createSendEmailVerification(authPort: AuthPort): SendEmailVerification {
  return async (): Promise<SendEmailVerificationResult> => {
    try {
      await authPort.sendEmailVerification();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
