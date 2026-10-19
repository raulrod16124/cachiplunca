import { useCallback, useRef, useState } from 'react';
import type { LogoutUser } from '../../../application/commands';
import { toAppError } from '../../../shared/errors';
import { describeLoginError } from './auth-error-messages';
import { localizeMessage, useI18n } from '../../i18n';

export interface SignOutController {
  readonly signingOut: boolean;
  readonly signOutError: string | null;
  readonly signOut: () => Promise<void>;
}

export function useSignOut(logoutUser: LogoutUser): SignOutController {
  const { t } = useI18n();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const signOut = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setSigningOut(true);
    setSignOutError(null);

    try {
      const result = await logoutUser();
      if (result.status === 'error') {
        setSignOutError(localizeMessage(t, describeLoginError(result.error)));
      }
    } catch (error) {
      setSignOutError(localizeMessage(t, describeLoginError(toAppError(error))));
    } finally {
      inFlightRef.current = false;
      setSigningOut(false);
    }
  }, [logoutUser, t]);

  return { signingOut, signOutError, signOut };
}
