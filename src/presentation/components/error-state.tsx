import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
}: ErrorStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="alert" aria-live="polite" align="center" justify="center">
      <Stack gap="space-1" align="center">
        <Text weight="font.weight.semibold">{title}</Text>
        {description ? <Text color="color.text.muted">{description}</Text> : null}
      </Stack>
      {actionLabel || dismissible ? (
        <Inline gap="space-2">
          {actionLabel && onAction ? (
            <Button type="button" variant="primary" onClick={onAction}>
              {actionLabel}
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
