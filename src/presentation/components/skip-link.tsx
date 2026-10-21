import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

export function SkipLink(): ReactNode {
  const { t } = useI18n();

  return (
    <a className="cach-skip-link" href="#main-content">
      {t('a11y.skipToContent')}
    </a>
  );
}
