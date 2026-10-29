import { Button, Heading, Stack, Text } from '@raulrod/ui';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import type { OpenGuestWorkspace, OpenGuestWorkspaceResult } from '../../../application/commands';
import type { ElementId } from '../../../domain/shared';
import { toAppError } from '../../../shared/errors';
import { FullPageLoading } from '../../components/full-page-loading';
import { localizeMessage, useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import { describeOpenGuestWorkspaceError } from './guest-link-error-messages';
import { GuestWorkspaceView } from './guest-workspace-view';

const Page = styled.main`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.color.background.default};
`;

const Panel = styled.div`
  width: min(100%, 520px);
  padding: ${({ theme }) => theme.space[6]};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.background.surface};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

export interface GuestWorkspacePageProps {
  readonly openGuestWorkspace: OpenGuestWorkspace;
  readonly generateElementId: () => ElementId;
}

type ViewState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'ok'; readonly result: Extract<OpenGuestWorkspaceResult, { status: 'ok' }> }
  | { readonly status: 'invalid' }
  | { readonly status: 'revoked' }
  | { readonly status: 'error'; readonly message: string };

export function GuestWorkspacePage({
  openGuestWorkspace,
  generateElementId,
}: GuestWorkspacePageProps): ReactNode {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const session = useSession();
  const startedRef = useRef(false);
  const [state, setState] = useState<ViewState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const currentToken = token ?? '';

  useEffect(() => {
    if (startedRef.current || session.status === 'loading') {
      return;
    }
    startedRef.current = true;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const result = await openGuestWorkspace({
          token: currentToken,
          currentUserId: session.status === 'authenticated' ? session.user.uid : undefined,
        });

        if (result.status === 'ok') {
          setState({ status: 'ok', result });
          return;
        }
        if (result.status === 'invalid' || result.status === 'revoked') {
          setState({ status: result.status });
          return;
        }
        setState({
          status: 'error',
          message: localizeMessage(t, describeOpenGuestWorkspaceError(result.error)),
        });
      } catch (error) {
        setState({
          status: 'error',
          message: localizeMessage(t, describeOpenGuestWorkspaceError(toAppError(error))),
        });
      }
    })();
  }, [attempt, currentToken, openGuestWorkspace, session, t]);

  const handleRetry = useCallback((): void => {
    startedRef.current = false;
    setState({ status: 'idle' });
    setAttempt((value) => value + 1);
  }, []);

  if (session.status === 'loading' || state.status === 'loading' || state.status === 'idle') {
    return (
      <FullPageLoading
        messageKey={session.status === 'loading' ? 'session.restoring' : 'guest.loading'}
      />
    );
  }

  if (state.status === 'ok') {
    return (
      <GuestWorkspaceView
        workspace={state.result.workspace}
        elements={state.result.elements}
        generateElementId={generateElementId}
      />
    );
  }

  if (state.status === 'invalid' || state.status === 'revoked') {
    return (
      <Page id="main-content" tabIndex={-1}>
        <Panel>
          <Stack gap="space-3">
            <Heading as="h1">
              {state.status === 'invalid' ? t('guest.invalid.title') : t('guest.revoked.title')}
            </Heading>
            <Text color="color.text.muted">
              {state.status === 'invalid'
                ? t('guest.invalid.description')
                : t('guest.revoked.description')}
            </Text>
          </Stack>
        </Panel>
      </Page>
    );
  }

  return (
    <Page id="main-content" tabIndex={-1}>
      <Panel>
        <Stack gap="space-3">
          <Heading as="h1">{t('guest.error.title')}</Heading>
          <Text role="alert" color="color.text.danger">
            {state.status === 'error' ? state.message : null}
          </Text>
          <Button type="button" variant="primary" onClick={handleRetry}>
            {t('common.retry')}
          </Button>
        </Stack>
      </Panel>
    </Page>
  );
}
