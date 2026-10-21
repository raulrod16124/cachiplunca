import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { HeadingLevel } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { StateIllustration, StateTitle } from './state-shared';
import type { StateTitleVariant, StateTone } from './state-shared';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  illustration?: ReactNode;
  tone?: StateTone;
  titleVariant?: StateTitleVariant;
  titleAs?: HeadingLevel;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  dismissible = false,
  onDismiss,
  illustration,
  tone = 'danger',
  titleVariant = 'default',
  titleAs = 'h2',
}: ErrorStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="alert" aria-live="polite" align="center" justify="center">
      {illustration ? (
        <StateIllustration $tone={tone} aria-hidden="true" data-testid="state-illustration">
          {illustration}
        </StateIllustration>
      ) : null}
      <Stack gap="space-1" align="center">
        <StateTitle as={titleAs} titleVariant={titleVariant}>
          {title}
        </StateTitle>
        {description ? <Text color="color.text.muted">{description}</Text> : null}
      </Stack>
      {actionLabel || secondaryActionLabel || dismissible ? (
        <Inline gap="space-2">
          {actionLabel && onAction ? (
            <Button type="button" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button type="button" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
          {dismissible && onDismiss ? (
            <Button type="button" variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </Inline>
      ) : null}
    </Stack>
  );
}
