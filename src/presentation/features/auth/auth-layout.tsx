import { Check } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { BrandLogo } from '../../components';
import { useI18n, type TranslationKey } from '../../i18n';

const Screen = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
  background:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, ${({ theme }) => theme.color.action.primary.background} 12%, transparent),
      transparent 45%
    ),
    ${({ theme }) => theme.color.background.default};
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  width: 100%;
  max-width: 980px;
  min-height: 560px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.background.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    min-height: 0;
  }
`;

const BrandPanel = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[8]};
  padding: ${({ theme }) => theme.space[10]};
  background: ${({ theme }) => theme.color.action.primary.background};
  color: ${({ theme }) => theme.color.action.primary.text};

  @media (max-width: 860px) {
    padding: ${({ theme }) => theme.space[6]};
    gap: ${({ theme }) => theme.space[4]};
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

const Pitch = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const PitchTitle = styled.p`
  margin: 0;
  max-width: 22ch;
  font-size: ${({ theme }) => theme.font.size['2xl']};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: ${({ theme }) => theme.font.leading.tight};
  letter-spacing: ${({ theme }) => theme.font.tracking.tight};
`;

const Points = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Point = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.font.size.sm};
  opacity: 0.9;
`;

const FormPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[10]};

  @media (max-width: 860px) {
    padding: ${({ theme }) => theme.space[6]};
  }
`;

const FormInner = styled.div`
  width: 100%;
  max-width: 360px;
`;

const POINTS: readonly TranslationKey[] = [
  'brand.point.canvas',
  'brand.point.realtime',
  'brand.point.plan',
];

export interface AuthLayoutProps {
  readonly children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps): ReactNode {
  const { t } = useI18n();

  return (
    <Screen>
      <Shell>
        <BrandPanel>
          <Brand>
            <BrandLogo variant="wordmark" size="lg" />
          </Brand>
          <Pitch>
            <PitchTitle>{t('brand.tagline')}</PitchTitle>
            <Points>
              {POINTS.map((point) => (
                <Point key={point}>
                  <Check aria-hidden="true" size={16} />
                  {t(point)}
                </Point>
              ))}
            </Points>
          </Pitch>
        </BrandPanel>
        <FormPanel>
          <FormInner>{children}</FormInner>
        </FormPanel>
      </Shell>
    </Screen>
  );
}
