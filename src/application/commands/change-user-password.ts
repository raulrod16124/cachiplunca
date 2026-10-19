import { toAppError, type AppError } from '../../shared/errors';
import { PASSWORD_MIN_LENGTH } from '../../shared/utils';
import type { AuthPort } from '../ports';

export interface ChangeUserPasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export type ChangeUserPasswordFieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type ChangeUserPasswordFieldErrors = Partial<Record<ChangeUserPasswordFieldName, string>>;

export type ChangeUserPasswordResult =
  | { readonly status: 'ok' }
  | { readonly status: 'invalid-input'; readonly fieldErrors: ChangeUserPasswordFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type ChangeUserPassword = (
  input: ChangeUserPasswordInput,
) => Promise<ChangeUserPasswordResult>;

export function validateChangeUserPasswordInput(
  input: ChangeUserPasswordInput,
): ChangeUserPasswordFieldErrors {
  const fieldErrors: ChangeUserPasswordFieldErrors = {};

  if (input.currentPassword.length === 0) {
    fieldErrors.currentPassword = 'Enter your current password.';
  }

  if (input.newPassword.length === 0) {
    fieldErrors.newPassword = 'Choose a new password.';
  } else if (input.newPassword.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.newPassword = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (input.confirmPassword !== input.newPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  return fieldErrors;
}

export function createChangeUserPassword(authPort: AuthPort): ChangeUserPassword {
  return async (input: ChangeUserPasswordInput): Promise<ChangeUserPasswordResult> => {
    const fieldErrors = validateChangeUserPasswordInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      await authPort.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
