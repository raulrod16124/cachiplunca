import { Check } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { BrandLogo, DecorativeBlob, DecorativeSpark, PaperTexture } from '../../components';
import { useI18n, type TranslationKey } from '../../i18n';
import { brandVar } from '../../styles/brand/brand-tokens';

const Screen = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
  background:
    radial-gradient(
      circle at 12% 0%,
      color-mix(in srgb, ${brandVar('orange-500')} 14%, transparent),
      transparent 42%
    ),
    ${({ theme }) => theme.color.background.default};
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  width: 100%;
  max-width: 980px;
  min-height: 580px;
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
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 88% 8%,
      color-mix(in srgb, ${brandVar('mustard-500')} 16%, transparent),
      transparent 38%
    ),
    linear-gradient(155deg, ${brandVar('green-900')} 0%, ${brandVar('green-950')} 100%);
  color: ${brandVar('cream-0')};
`;

const PanelTexture = styled(PaperTexture)`
  opacity: 0.3;
`;

const Decoration = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;

  & > svg:first-child {
    position: absolute;
    right: -1.5rem;
    bottom: 2.5rem;
    opacity: 0.22;
  }

  & > svg:last-child {
    position: absolute;
    top: 4.5rem;
    right: 2.75rem;
    opacity: 0.9;
  }

  @media (max-width: 860px) {
    display: none;
  }
`;

const PanelContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[8]};
  padding: ${({ theme }) => theme.space[10]};

  @media (max-width: 860px) {
    padding: ${({ theme }) => theme.space[4]};
    gap: ${({ theme }) => theme.space[3]};
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
  max-width: 18ch;
  font-family: ${({ theme }) => theme.font.family.display};
  font-size: ${({ theme }) => theme.font.size['3xl']};
  font-weight: ${({ theme }) => theme.font.weight.regular};
  line-height: 1.05;
  letter-spacing: ${({ theme }) => theme.font.tracking.normal};

  @media (max-width: 860px) {
    font-size: ${({ theme }) => theme.font.size['2xl']};
  }
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

const PointIcon = styled.span`
  display: inline-flex;
  flex: none;
  color: ${brandVar('mustard-500')};
`;

const FormPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[10]};

  @media (max-width: 860px) {
    padding: ${({ theme }) => theme.space[4]};
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
    <Screen id="main-content" tabIndex={-1}>
      <Shell>
        <BrandPanel>
          <PanelTexture />
          <Decoration>
            <DecorativeBlob color="olive-500" size="lg" />
            <DecorativeSpark color="mustard-500" size="lg" />
          </Decoration>
          <PanelContent>
            <Brand>
              <BrandLogo variant="wordmark" size="lg" />
            </Brand>
            <Pitch>
              <PitchTitle>{t('brand.tagline')}</PitchTitle>
              <Points>
                {POINTS.map((point) => (
                  <Point key={point}>
                    <PointIcon aria-hidden="true">
                      <Check size={16} />
                    </PointIcon>
                    {t(point)}
                  </Point>
                ))}
              </Points>
            </Pitch>
          </PanelContent>
        </BrandPanel>
        <FormPanel>
          <FormInner>{children}</FormInner>
        </FormPanel>
      </Shell>
    </Screen>
  );
}
