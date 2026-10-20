import { Button, Heading, Input, Stack, Text } from '@raulrod/ui';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GuestLinkServices } from '../../../../application/guest-link-services';
import type { GuestLink } from '../../../../domain/guest-link';
import { toAppError } from '../../../../shared/errors';
import { localizeMessage, useI18n } from '../../../i18n';
import { formatShortDate } from '../../../i18n/format';
import { buildGuestViewLink } from '../../guest/guest-link';
import {
  describeCreateGuestLinkError,
  describeListGuestLinksError,
  describeRevokeGuestLinkError,
} from '../../guest/guest-link-error-messages';

export interface GuestLinkPanelProps {
  readonly active: boolean;
  readonly workspaceId: string;
  readonly currentUserId: string;
  readonly services: GuestLinkServices;
}

export function GuestLinkPanel({
  active,
  workspaceId,
  currentUserId,
  services,
}: GuestLinkPanelProps): ReactNode {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [links, setLinks] = useState<readonly GuestLink[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeLink = links[0];
  const link = useMemo(() => (token === null ? null : buildGuestViewLink(token)), [token]);

  const fetchLinks = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await services.listActiveGuestLinks({ workspaceId, userId: currentUserId });
      if (result.status === 'ok') {
        setLinks(result.links);
        setStatus('ready');
        return;
      }
      setErrorMessage(localizeMessage(t, describeListGuestLinksError(result.error)));
      setStatus('error');
    } catch (error) {
      setErrorMessage(localizeMessage(t, describeListGuestLinksError(toAppError(error))));
      setStatus('error');
    }
  }, [currentUserId, services, t, workspaceId]);

  useEffect(() => {
    if (!active) {
      setToken(null);
      return;
    }
    setCopied(false);
    void fetchLinks();
  }, [active, fetchLinks]);

  const handleCreate = useCallback(async (): Promise<void> => {
    setBusy(true);
    setErrorMessage(null);
    setCopied(false);
    try {
      const result = await services.createGuestLink({ workspaceId, actorUserId: currentUserId });
      if (result.status === 'ok') {
        setToken(result.token);
        await fetchLinks();
        return;
      }
      if (result.status === 'invalid-input') {
        setErrorMessage(t('share.guest.errorCreate'));
        return;
      }
      setErrorMessage(localizeMessage(t, describeCreateGuestLinkError(result.error)));
    } catch (error) {
      setErrorMessage(localizeMessage(t, describeCreateGuestLinkError(toAppError(error))));
    } finally {
      setBusy(false);
    }
  }, [currentUserId, fetchLinks, services, t, workspaceId]);

  const handleRevoke = useCallback(async (): Promise<void> => {
    if (activeLink === undefined) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setCopied(false);
    try {
      const result = await services.revokeGuestLink({
        workspaceId,
        actorUserId: currentUserId,
        tokenHash: activeLink.tokenHash,
      });
      if (result.status === 'ok') {
        setToken(null);
        await fetchLinks();
        return;
      }
      if (result.status === 'invalid-input') {
        setErrorMessage(t('share.guest.errorRevoke'));
        return;
      }
      setErrorMessage(localizeMessage(t, describeRevokeGuestLinkError(result.error)));
    } catch (error) {
      setErrorMessage(localizeMessage(t, describeRevokeGuestLinkError(toAppError(error))));
    } finally {
      setBusy(false);
    }
  }, [activeLink, currentUserId, fetchLinks, services, t, workspaceId]);

  async function handleCopy(): Promise<void> {
    if (link === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Stack gap="space-4">
      <Stack gap="space-2">
        <Heading as="h3">{t('share.guest.title')}</Heading>
        <Text color="color.text.muted">{t('share.guest.description')}</Text>
      </Stack>

      {status === 'loading' ? <Text role="status">{t('common.loading')}</Text> : null}

      {status === 'error' ? (
        <Stack gap="space-2">
          <Text role="alert" color="color.text.danger">
            {errorMessage}
          </Text>
          <Button type="button" variant="outline" onClick={() => void fetchLinks()}>
            {t('common.retry')}
          </Button>
        </Stack>
      ) : null}

      {status === 'ready' ? (
        <Stack gap="space-3">
          {activeLink === undefined ? (
            <Text color="color.text.muted">{t('share.guest.inactive')}</Text>
          ) : (
            <Text color="color.text.success">
              {t('share.guest.active', {
                date: formatShortDate(activeLink.createdAt, locale),
              })}
            </Text>
          )}

          {link === null ? null : (
            <Stack gap="space-2">
              <Text color="color.text.muted">{t('share.guest.linkHint')}</Text>
              <Input
                readOnly
                aria-label={t('share.guest.linkLabel')}
                value={link}
                onFocus={(event) => event.target.select()}
              />
              <Stack gap="space-1">
                <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                  {t('common.copyLink')}
                </Button>
                {copied ? (
                  <Text role="status" aria-live="polite" color="color.text.muted">
                    {t('common.copied')}
                  </Text>
                ) : null}
              </Stack>
            </Stack>
          )}

          {errorMessage === null ? null : (
            <Text role="alert" color="color.text.danger">
              {errorMessage}
            </Text>
          )}

          <Stack gap="space-2">
            <Button
              type="button"
              variant="primary"
              loading={busy}
              onClick={() => void handleCreate()}
            >
              {activeLink === undefined ? t('share.guest.create') : t('share.guest.replace')}
            </Button>
            {activeLink === undefined ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void handleRevoke()}
              >
                {t('share.guest.revoke')}
              </Button>
            )}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
