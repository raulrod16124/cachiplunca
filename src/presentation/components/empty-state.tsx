import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps): ReactNode {
  return (
    <Stack gap="space-3" role="status" aria-live="polite" align="center" justify="center">
      {icon ? <Inline>{icon}</Inline> : null}
      <Stack gap="space-1" align="center">
        <Text weight="font.weight.semibold">{title}</Text>
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
