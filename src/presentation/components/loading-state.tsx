import { Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface LoadingStateProps {
  message?: string;
  label?: string;
  children?: ReactNode;
}

export function LoadingState({
  message = 'Loading...',
  label,
  children,
}: LoadingStateProps): ReactNode {
  if (children !== undefined) {
    return (
      <Stack gap="space-2" role="status" aria-live="polite" aria-busy="true">
        {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
        {children}
      </Stack>
    );
  }

  return (
    <Stack
      gap="space-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
      align="center"
      justify="center"
    >
      {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
      <Inline gap="space-1" align="center">
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
      </Inline>
      {message !== '' ? <Text color="color.text.muted">{message}</Text> : null}
    </Stack>
  );
}
