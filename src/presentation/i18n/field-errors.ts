import type { I18nContextValue } from './i18n-provider';
import type { TranslationKey } from './messages';

const FIELD_ERROR_KEYS: Readonly<Record<string, TranslationKey>> = {
  'Enter your email address.': 'auth.errors.emailRequired',
  'Enter a valid email address.': 'auth.errors.emailInvalid',
  'Enter your password.': 'auth.errors.passwordRequired',
  'Choose a password.': 'auth.errors.passwordChoose',
  'Password must be at least 6 characters.': 'auth.errors.passwordMin',
  'Enter your display name.': 'profile.displayName.required',
  'Display names cannot exceed 80 characters.': 'profile.displayName.tooLong',
  'Enter your new email address.': 'profile.email.required',
  'Enter your current password.': 'profile.currentPassword.required',
  'Choose a new password.': 'profile.password.newRequired',
  'Passwords do not match.': 'profile.password.mismatch',
  'Enter a board name.': 'workspaces.errors.nameRequired',
  'Board name cannot exceed 100 characters.': 'workspaces.errors.nameTooLong',
  'Board name must be at most 100 characters.': 'workspaces.errors.nameTooLong',
  'Board names cannot exceed 100 characters.': 'workspaces.errors.nameTooLong',
};

export function localizeFieldError(t: I18nContextValue['t'], message: string): string {
  const key = FIELD_ERROR_KEYS[message];
  return key === undefined ? message : t(key);
}
