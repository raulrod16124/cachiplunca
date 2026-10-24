import { Check } from '@raulrod/icons';
import { Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { BrandLogo, DecorativeSpark } from '../../components';
import { useI18n, type TranslationKey } from '../../i18n';

const Screen = styled.main`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: ${({ theme }) => `${theme.space[4]} ${theme.space[6]}`};
  background-color: var(--stitch-bg);
  background-image: radial-gradient(var(--stitch-surface-high) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--stitch-text);
  font-family: var(--stitch-font-body);

  @media (max-width: 860px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const CardArea = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 48fr) minmax(0, 52fr);
  width: 100%;
  max-width: 1040px;
  min-height: 580px;
  overflow: hidden;
  border-radius: var(--stitch-radius-card);
  background: var(--stitch-surface);
  box-shadow: var(--stitch-card-shadow);

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
  background: linear-gradient(
    135deg,
    var(--cach-green-900) 0%,
    var(--stitch-nav-active-bg) 52%,
    var(--cach-green-980) 100%
  );
  color: var(--cach-cream-0);
`;

const Hatch = styled.div`
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    45deg,
    var(--cach-cream-0) 0,
    var(--cach-cream-0) 1px,
    transparent 0,
    transparent 24px
  );
  opacity: 0.06;
  pointer-events: none;
`;

const Glows = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: ${({ theme }) => theme.radius.full};
    filter: blur(64px);
  }

  &::before {
    bottom: -96px;
    left: -80px;
    width: 320px;
    height: 320px;
    background: color-mix(in srgb, var(--stitch-primary) 20%, transparent);
  }

  &::after {
    top: 25%;
    right: 0;
    width: 256px;
    height: 256px;
    background: color-mix(in srgb, var(--stitch-secondary) 10%, transparent);
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
  padding: ${({ theme }) => theme.space[8]};

  @media (min-width: 1024px) {
    padding: ${({ theme }) => theme.space[12]};
  }

  @media (max-width: 860px) {
    gap: ${({ theme }) => theme.space[6]};
    padding: ${({ theme }) => theme.space[6]};
  }
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
`;

const Spark = styled(DecorativeSpark)`
  flex: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: auth-spark-pulse 3s ${({ theme }) => theme.motion.easing.standard} infinite;
  }

  @keyframes auth-spark-pulse {
    50% {
      opacity: 0.55;
      transform: scale(0.92);
    }
  }
`;

const Pitch = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
  margin-top: ${({ theme }) => theme.space[8]};
  margin-bottom: ${({ theme }) => theme.space[1]};

  @media (max-width: 860px) {
    margin-top: ${({ theme }) => theme.space[4]};
  }
`;

const PitchTitle = styled.p`
  max-width: 20ch;
  margin: 0;
  color: var(--cach-cream-0);
  font-family: var(--stitch-font-body);
  font-size: calc(var(--rr-font-size-base) * 1.5);
  font-style: italic;
  font-weight: ${({ theme }) => theme.font.weight.bold};
  line-height: 1.32;
  letter-spacing: -0.01em;
  text-transform: uppercase;
`;

const PitchAccent = styled.span`
  color: var(--cach-mustard-500);
`;

const Divider = styled.div`
  width: ${({ theme }) => theme.space[16]};
  height: 6px;
  margin-top: ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: var(--stitch-primary-hover);
`;

const Points = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Point = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  color: var(--cach-cream-0);
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: ${({ theme }) => theme.font.leading.normal};
`;

const PointIcon = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: var(--stitch-secondary);
  color: var(--stitch-secondary-soft);
`;

const FormPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[8]};
  background: var(--stitch-surface);

  @media (min-width: 1024px) {
    padding: ${({ theme }) => theme.space[12]};
  }

  @media (max-width: 860px) {
    padding: ${({ theme }) => `${theme.space[6]} ${theme.space[4]}`};
  }
`;

const FormInner = styled.div`
  width: 100%;
  max-width: 400px;
`;

const Footer = styled.footer`
  padding-top: ${({ theme }) => theme.space[5]};
  text-align: center;
`;

const FooterText = styled(Text)`
  color: var(--stitch-text-muted);
  opacity: 0.8;
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
    <Screen id="main-content" tabIndex={-1} data-surface="stitch">
      <CardArea>
        <Shell>
          <BrandPanel>
            <Hatch aria-hidden="true" data-auth-decoration="hatch" />
            <Glows aria-hidden="true" />
            <PanelContent>
              <BrandRow>
                <BrandLogo variant="wordmark" size="lg" tone="dark" />
                <Spark color="mustard-500" size="md" />
              </BrandRow>
              <Pitch>
                <div>
                  <PitchTitle>
                    {t('brand.tagline.lead')}
                    <br />
                    <PitchAccent>{t('brand.tagline.accent')}</PitchAccent>
                  </PitchTitle>
                  <Divider />
                </div>
                <Points>
                  {POINTS.map((point) => (
                    <Point key={point}>
                      <PointIcon aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
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
      </CardArea>
      <Footer>
        <FooterText size="font.size.sm">{t('app.copyright')}</FooterText>
      </Footer>
    </Screen>
  );
}
