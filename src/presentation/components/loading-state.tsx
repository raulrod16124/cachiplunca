import { Inline, Skeleton, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps): ReactNode {
  return (
    <Stack gap="space-2" role="status" aria-live="polite" align="center" justify="center">
      <Inline gap="space-1" align="center">
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
        <Skeleton variant="circle" style={{ width: '8px', height: '8px' }} />
      </Inline>
      {message !== '' ? <Text color="color.text.muted">{message}</Text> : null}
    </Stack>
  );
}
