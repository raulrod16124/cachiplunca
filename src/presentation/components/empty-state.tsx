import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import type { HeadingLevel } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  titleAs?: HeadingLevel;
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  icon,
  titleAs = 'h2',
}: EmptyStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="status" aria-live="polite" align="center" justify="center">
      {icon ? <Inline>{icon}</Inline> : null}
      <Stack gap="space-1" align="center">
        <Heading as={titleAs}>{title}</Heading>
        {description ? <Text color="color.text.muted">{description}</Text> : null}
      </Stack>
      {actionLabel && onAction ? (
        <Button type="button" variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
