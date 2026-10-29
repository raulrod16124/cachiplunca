import { Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useI18n, type TranslationKey } from '../i18n';
import { BrandLogo, type BrandLogoSize } from './brand-logo';
import { Spinner } from './spinner';

export type FullPageLoadingVariant = 'page' | 'section';

const PageRoot = styled.main`
  display: grid;
  box-sizing: border-box;
  place-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.color.background.default};
  color: ${({ theme }) => theme.color.text.primary};
`;

const SectionRoot = styled.div`
  display: grid;
  box-sizing: border-box;
  place-items: center;
  width: 100%;
  min-height: 320px;
  padding-block: ${({ theme }) => theme.space[8]};
`;

const StatusRegion = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  width: 100%;
`;

const MessageBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  max-width: 420px;
  text-align: center;
`;

const IndicatorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
`;

export interface FullPageLoadingProps {
  readonly messageKey?: TranslationKey;
  readonly message?: string;
  readonly label?: string;
  readonly variant?: FullPageLoadingVariant;
  readonly logoSize?: BrandLogoSize;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export function FullPageLoading({
  messageKey = 'loadingScreen.default',
  message,
  label,
  variant = 'page',
  logoSize,
  children,
  testId = 'full-page-loading',
}: FullPageLoadingProps): ReactNode {
  const { t } = useI18n();
  const resolvedMessage = message ?? t(messageKey);
  const resolvedLogoSize = logoSize ?? (variant === 'section' ? 'sm' : 'md');

  const content = (
    <StatusRegion role="status" aria-live="polite" aria-busy="true" data-testid={testId}>
      <MessageBlock>
        <BrandLogo variant="wordmark" responsive size={resolvedLogoSize} />
        <IndicatorRow>
          <Spinner decorative />
          {resolvedMessage !== '' ? <Text color="color.text.muted">{resolvedMessage}</Text> : null}
        </IndicatorRow>
        {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
      </MessageBlock>
      {children}
    </StatusRegion>
  );

  if (variant === 'section') {
    return <SectionRoot>{content}</SectionRoot>;
  }

  return (
    <PageRoot id="main-content" tabIndex={-1}>
      {content}
    </PageRoot>
  );
}
