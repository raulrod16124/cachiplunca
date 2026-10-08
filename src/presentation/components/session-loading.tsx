import { Inline, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';

export function SessionLoading(): ReactNode {
  return (
    <Inline gap="space-2" align="center" justify="center">
      <Text role="status" color="color.text.muted">
        Restoring your session…
      </Text>
    </Inline>
  );
}
