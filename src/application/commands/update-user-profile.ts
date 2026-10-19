import { toAppError, type AppError } from '../../shared/errors';
import type { AuthPort, AuthUser } from '../ports';

export const DISPLAY_NAME_MAX_LENGTH = 80;

export interface UpdateUserProfileInput {
  readonly displayName: string;
}

export interface UpdateUserProfileFieldErrors {
  readonly displayName?: string;
}

export type UpdateUserProfileResult =
  | { readonly status: 'ok'; readonly user: AuthUser }
  | { readonly status: 'invalid-input'; readonly fieldErrors: UpdateUserProfileFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type UpdateUserProfile = (input: UpdateUserProfileInput) => Promise<UpdateUserProfileResult>;

export function validateUpdateUserProfileInput(
  input: UpdateUserProfileInput,
): UpdateUserProfileFieldErrors {
  const displayName = input.displayName.trim();
  if (displayName.length === 0) {
    return { displayName: 'Enter your display name.' };
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { displayName: 'Display names cannot exceed 80 characters.' };
  }
  return {};
}

export function createUpdateUserProfile(authPort: AuthPort): UpdateUserProfile {
  return async (input: UpdateUserProfileInput): Promise<UpdateUserProfileResult> => {
    const fieldErrors = validateUpdateUserProfileInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const user = await authPort.updateDisplayName(input.displayName.trim());
      return { status: 'ok', user };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
