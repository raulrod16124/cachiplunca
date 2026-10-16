import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../providers/session-provider';
import type { AcceptInvitation, AcceptInvitationResult } from '../../../application/commands';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../shared/errors';
import { ErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { SessionLoading } from '../../components/session-loading';
import { AuthLayout } from '../auth/auth-layout';
import { describeAcceptInvitationError } from './invitation-error-messages';

export interface AcceptInvitationPageProps {
  readonly acceptInvitation: AcceptInvitation;
}

function buildAuthRedirect(token: string): string {
  return `/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`;
}

export function AcceptInvitationPage({ acceptInvitation }: AcceptInvitationPageProps): ReactNode {
  const { token } = useParams<{ token: string }>();
  const session = useSession();
  const navigate = useNavigate();
  const [result, setResult] = useState<AcceptInvitationResult | null>(null);
  const startedRef = useRef(false);

  const currentToken = token ?? '';

  useEffect(() => {
    if (startedRef.current || session.status !== 'authenticated') {
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    void acceptInvitation({
      token: currentToken,
      userId: UserId.create(session.user.uid),
      userEmail: session.user.email ?? '',
    }).then((next) => {
      if (!cancelled) {
        setResult(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [acceptInvitation, currentToken, session]);

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
            <Heading as="h1">Accept invitation</Heading>
            <Text color="color.text.muted">
              Sign in or create an account with the invited email to join this workspace.
            </Text>
          </Stack>
          <Inline gap="space-2" align="center">
            <Button type="button" variant="primary" onClick={() => navigate(redirect)}>
              Sign in
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(redirect.replace('/login?', '/register?'))}
            >
              Create account
            </Button>
          </Inline>
        </Stack>
      </AuthLayout>
    );
  }

  if (result === null) {
    return (
      <AuthLayout>
        <LoadingState message="Accepting invitation…" />
      </AuthLayout>
    );
  }

  if (result.status === 'ok') {
    return (
      <AuthLayout>
        <Stack gap="space-4">
          <Stack gap="space-2">
            <Heading as="h1">Invitation accepted</Heading>
            <Text color="color.text.success">
              You now have access to this workspace as {result.role}.
            </Text>
          </Stack>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(`/workspaces/${result.workspaceId.value}`)}
          >
            Go to workspace
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
        title="We could not accept the invitation"
        titleAs="h1"
        description={describeAcceptInvitationError(error)}
        actionLabel="Back to your workspaces"
        onAction={() => navigate('/workspaces')}
      />
    </AuthLayout>
  );
}
