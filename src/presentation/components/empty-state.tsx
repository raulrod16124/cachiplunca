import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ButtonVariant, HeadingLevel } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { StateIllustration, StateTitle } from './state-shared';
import type { StateTitleVariant, StateTone } from './state-shared';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  icon?: ReactNode;
  illustration?: ReactNode;
  tone?: StateTone;
  titleVariant?: StateTitleVariant;
  titleAs?: HeadingLevel;
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  icon,
  illustration,
  tone = 'neutral',
  titleVariant = 'default',
  titleAs = 'h2',
}: EmptyStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="status" aria-live="polite" align="center" justify="center">
      {illustration ? (
        <StateIllustration $tone={tone} aria-hidden="true" data-testid="state-illustration">
          {illustration}
        </StateIllustration>
      ) : null}
      {icon ? <Inline>{icon}</Inline> : null}
      <Stack gap="space-1" align="center">
        <StateTitle as={titleAs} titleVariant={titleVariant}>
          {title}
        </StateTitle>
        {description ? <Text color="color.text.muted">{description}</Text> : null}
      </Stack>
      {actionLabel && onAction ? (
        <Button type="button" variant={actionVariant} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
