import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../providers/session-provider';
import type {
  AcceptInvitation,
  AcceptInvitationResult,
  RefreshUser,
  SendEmailVerification,
} from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES, toAppError } from '../../../shared/errors';
import { ErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { SessionLoading } from '../../components/session-loading';
import { AuthLayout } from '../auth/auth-layout';
import { localizeMessage, useI18n } from '../../i18n';
import { describeAcceptInvitationError } from './invitation-error-messages';

export interface AcceptInvitationPageProps {
  readonly acceptInvitation: AcceptInvitation;
  readonly sendEmailVerification?: SendEmailVerification;
  readonly refreshUser?: RefreshUser;
}

function buildAuthRedirect(token: string): string {
  return `/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`;
}

export function AcceptInvitationPage({
  acceptInvitation,
  sendEmailVerification,
  refreshUser,
}: AcceptInvitationPageProps): ReactNode {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const session = useSession();
  const navigate = useNavigate();
  const [result, setResult] = useState<AcceptInvitationResult | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  const currentToken = token ?? '';

  useEffect(() => {
    if (startedRef.current || session.status !== 'authenticated') {
      return;
    }
    startedRef.current = true;

    void (async () => {
      let user: AuthUser = session.user;
      if (refreshUser !== undefined) {
        const refreshed = await refreshUser();
        if (refreshed.status === 'ok') {
          user = refreshed.user;
        }
      }

      if (!user.emailVerified) {
        setNeedsVerification(true);
        setResult(null);
        return;
      }

      setNeedsVerification(false);
      const next = await acceptInvitation({
        token: currentToken,
        userId: UserId.create(user.uid),
        userEmail: user.email ?? '',
        userEmailVerified: true,
      });
      setResult(next);
    })();
  }, [acceptInvitation, attempt, currentToken, refreshUser, session]);

  const handleRetry = () => {
    startedRef.current = false;
    setResult(null);
    setNeedsVerification(false);
    setVerificationStatus('idle');
    setVerificationError(null);
    setAttempt((value) => value + 1);
  };

  const handleSendVerification = async (): Promise<void> => {
    if (sendEmailVerification === undefined) {
      return;
    }

    setVerificationStatus('sending');
    setVerificationError(null);
    try {
      const next = await sendEmailVerification();
      if (next.status === 'ok') {
        setVerificationStatus('sent');
        return;
      }
      setVerificationStatus('error');
      setVerificationError(localizeMessage(t, next.error.message));
    } catch (error) {
      setVerificationStatus('error');
      setVerificationError(localizeMessage(t, toAppError(error).message));
    }
  };

  if (session.status === 'loading') {
    return (
      <AuthLayout>
        <SessionLoading />
      </AuthLayout>
    );
  }

  if (session.status === 'anonymous') {
    const redirect = buildAuthRedirect(currentToken);
    return (
      <AuthLayout>
        <Stack gap="space-4">
          <Stack gap="space-2">
            <Heading as="h1">{t('auth.accept.title')}</Heading>
            <Text color="color.text.muted">{t('auth.accept.description')}</Text>
          </Stack>
          <Inline gap="space-2" align="center">
            <Button type="button" variant="primary" onClick={() => navigate(redirect)}>
              {t('auth.accept.signIn')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(redirect.replace('/login?', '/register?'))}
            >
              {t('auth.accept.createAccount')}
            </Button>
          </Inline>
        </Stack>
      </AuthLayout>
    );
  }

  if (needsVerification) {
    return (
      <AuthLayout>
        <Stack gap="space-4">
          <Stack gap="space-2">
            <Heading as="h1">{t('auth.accept.verifyTitle')}</Heading>
            <Text color="color.text.muted">
              {t('auth.accept.verifyDescription', { email: session.user.email ?? '' })}
            </Text>
          </Stack>
          {verificationStatus === 'sent' && (
            <Text role="status" color="color.text.success">
              {t('auth.accept.verificationSent')}
            </Text>
          )}
          {verificationError !== null && (
            <Text role="alert" color="color.text.danger">
              {verificationError}
            </Text>
          )}
          <Inline gap="space-2" align="center">
            {sendEmailVerification !== undefined && (
              <Button
                type="button"
                variant="secondary"
                loading={verificationStatus === 'sending'}
                onClick={() => void handleSendVerification()}
              >
                {t('auth.accept.resendVerification')}
              </Button>
            )}
            <Button type="button" variant="primary" onClick={handleRetry}>
              {t('auth.accept.verifiedRetry')}
            </Button>
          </Inline>
          <Button type="button" variant="link" onClick={() => navigate('/workspaces')}>
            {t('auth.accept.backToWorkspaces')}
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  if (result === null) {
    return (
      <AuthLayout>
        <LoadingState message={t('auth.accept.accepting')} />
      </AuthLayout>
    );
  }

  if (result.status === 'ok') {
    return (
      <AuthLayout>
        <Stack gap="space-4">
          <Stack gap="space-2">
            <Heading as="h1">{t('auth.accept.acceptedTitle')}</Heading>
            <Text color="color.text.success">
              {t('auth.accept.acceptedDescription', { role: result.role })}
            </Text>
          </Stack>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(`/workspaces/${result.workspaceId.value}`)}
          >
            {t('auth.accept.goToWorkspace')}
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  const error =
    result.status === 'invalid-input'
      ? createAppError(
          'validation',
          ERROR_CODES.VALIDATION_INVALID_INPUT,
          result.fieldErrors.token ?? 'Invalid invitation link.',
        )
      : result.error;

  return (
    <AuthLayout>
      <ErrorState
        title={t('auth.accept.errorTitle')}
        titleAs="h1"
        description={localizeMessage(t, describeAcceptInvitationError(error))}
        actionLabel={t('auth.accept.tryAgain')}
        onAction={handleRetry}
        secondaryActionLabel={t('auth.accept.backToWorkspaces')}
        onSecondaryAction={() => navigate('/workspaces')}
      />
    </AuthLayout>
  );
}
