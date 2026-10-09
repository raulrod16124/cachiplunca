import { toAppError, type AppError } from '../../shared/errors';
import { isValidEmail } from '../../shared/utils';
import type { AuthPort, AuthUser } from '../ports';

export interface LoginUserInput {
  readonly email: string;
  readonly password: string;
}

export type LoginFieldName = 'email' | 'password';

export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

export type LoginUserResult =
  | { readonly status: 'ok'; readonly user: AuthUser }
  | { readonly status: 'invalid-input'; readonly fieldErrors: LoginFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type LoginUser = (input: LoginUserInput) => Promise<LoginUserResult>;

export function validateLoginInput(input: LoginUserInput): LoginFieldErrors {
  const fieldErrors: LoginFieldErrors = {};

  const email = input.email.trim();
  if (email.length === 0) {
    fieldErrors.email = 'Enter your email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (input.password.length === 0) {
    fieldErrors.password = 'Enter your password.';
  }

  return fieldErrors;
}

export function createLoginUser(authPort: AuthPort): LoginUser {
  return async (input: LoginUserInput): Promise<LoginUserResult> => {
    const fieldErrors = validateLoginInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const user = await authPort.signIn({
        email: input.email.trim(),
        password: input.password,
      });
      return { status: 'ok', user };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
