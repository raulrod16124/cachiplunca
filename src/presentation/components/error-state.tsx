import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import type { HeadingLevel } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
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
  titleAs = 'h2',
}: ErrorStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="alert" aria-live="polite" align="center" justify="center">
      <Stack gap="space-1" align="center">
        <Heading as={titleAs}>{title}</Heading>
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
