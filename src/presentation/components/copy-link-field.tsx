import { Button, Input, Stack, Text } from '@raulrod/ui';
import { useId, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useI18n } from '../i18n';
import { Card } from './card';

export function linkDisplayAddress(link: string): string {
  try {
    return new URL(link).host;
  } catch {
    return link;
  }
}

const LinkRoot = styled(Card)`
  min-width: 0;
`;

const Summary = styled(Text)`
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Hint = styled(Text)`
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

export interface CopyLinkFieldProps {
  readonly link: string;
  readonly label: string;
  readonly hint?: string;
}

export function CopyLinkField({ link, label, hint }: CopyLinkFieldProps): ReactNode {
  const { t } = useI18n();
  const hintId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy(): Promise<void> {
    setCopied(false);
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <LinkRoot variant="sunken" padding="sm">
      <Stack gap="space-2">
        <Stack gap="space-1">
          <Text weight="font.weight.medium">{label}</Text>
          <Summary size="font.size.sm" color="color.text.muted">
            {linkDisplayAddress(link)}
          </Summary>
        </Stack>
        {hint === undefined ? null : (
          <Hint id={hintId} size="font.size.sm" color="color.text.muted">
            {hint}
          </Hint>
        )}
        <Input
          readOnly
          aria-label={label}
          aria-describedby={hint === undefined ? undefined : hintId}
          value={link}
          onFocus={(event) => event.target.select()}
        />
        <Actions>
          <Button type="button" variant="outline" onClick={() => void handleCopy()}>
            {t('common.copyLink')}
          </Button>
          {copied ? (
            <Text role="status" aria-live="polite" color="color.text.muted" size="font.size.sm">
              {t('common.copied')}
            </Text>
          ) : null}
        </Actions>
        {copyError ? (
          <Text role="alert" color="color.text.danger" size="font.size.sm">
            {t('common.copyFailed')}
          </Text>
        ) : null}
      </Stack>
    </LinkRoot>
  );
}
