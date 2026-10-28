import { Inline, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

export function SessionLoading(): ReactNode {
  const { t } = useI18n();

  return (
    <Inline gap="space-2" align="center" justify="center">
      <Text role="status" color="color.text.muted">
        {t('session.restoring')}
      </Text>
    </Inline>
  );
}
