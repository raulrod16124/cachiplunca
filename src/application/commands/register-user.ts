import { toAppError, type AppError } from '../../shared/errors';
import { isValidEmail, PASSWORD_MIN_LENGTH } from '../../shared/utils';
import type { AuthPort, AuthUser } from '../ports';

export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
}

export type RegisterFieldName = 'email' | 'password';

export type RegisterFieldErrors = Partial<Record<RegisterFieldName, string>>;

export type RegisterUserResult =
  | { readonly status: 'ok'; readonly user: AuthUser }
  | { readonly status: 'invalid-input'; readonly fieldErrors: RegisterFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type RegisterUser = (input: RegisterUserInput) => Promise<RegisterUserResult>;

export function validateRegisterInput(input: RegisterUserInput): RegisterFieldErrors {
  const fieldErrors: RegisterFieldErrors = {};

  const email = input.email.trim();
  if (email.length === 0) {
    fieldErrors.email = 'Enter your email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (input.password.length === 0) {
    fieldErrors.password = 'Choose a password.';
  } else if (input.password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return fieldErrors;
}

export function createRegisterUser(authPort: AuthPort): RegisterUser {
  return async (input: RegisterUserInput): Promise<RegisterUserResult> => {
    const fieldErrors = validateRegisterInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const user = await authPort.signUp({
        email: input.email.trim(),
        password: input.password,
      });
      return { status: 'ok', user };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
