import { toAppError, type AppError } from '../../shared/errors';
import { isValidEmail } from '../../shared/utils';
import type { AuthPort, AuthUser } from '../ports';

export interface ChangeUserEmailInput {
  readonly email: string;
  readonly currentPassword: string;
}

export type ChangeUserEmailFieldName = 'email' | 'currentPassword';

export type ChangeUserEmailFieldErrors = Partial<Record<ChangeUserEmailFieldName, string>>;

export type ChangeUserEmailResult =
  | { readonly status: 'ok'; readonly user: AuthUser }
  | { readonly status: 'invalid-input'; readonly fieldErrors: ChangeUserEmailFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type ChangeUserEmail = (input: ChangeUserEmailInput) => Promise<ChangeUserEmailResult>;

export function validateChangeUserEmailInput(
  input: ChangeUserEmailInput,
): ChangeUserEmailFieldErrors {
  const fieldErrors: ChangeUserEmailFieldErrors = {};
  const email = input.email.trim();

  if (email.length === 0) {
    fieldErrors.email = 'Enter your new email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (input.currentPassword.length === 0) {
    fieldErrors.currentPassword = 'Enter your current password.';
  }

  return fieldErrors;
}

export function createChangeUserEmail(authPort: AuthPort): ChangeUserEmail {
  return async (input: ChangeUserEmailInput): Promise<ChangeUserEmailResult> => {
    const fieldErrors = validateChangeUserEmailInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const user = await authPort.changeEmail({
        email: input.email.trim(),
        currentPassword: input.currentPassword,
      });
      return { status: 'ok', user };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
