import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { useI18n } from '../i18n';
import { brandVar } from '../styles/brand/brand-tokens';

export type BrandLogoVariant = 'wordmark' | 'compact' | 'isotipo';
export type BrandLogoSize = 'sm' | 'md' | 'lg';

const LETTERING_FONT_SIZE: Record<BrandLogoSize, string> = {
  sm: '18px',
  md: '24px',
  lg: '32px',
};

const ISOTOPO_DIMENSION: Record<BrandLogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

const LETTERING = 'CACHIPLUNCA';

const Root = styled.span<{ $size: BrandLogoSize }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  max-width: 100%;
  font-size: ${({ $size }) => LETTERING_FONT_SIZE[$size]};
  line-height: 1;
`;

const DecoratedSlot = styled.span<{ $responsive: boolean }>`
  display: inline-flex;

  ${({ $responsive }) =>
    $responsive &&
    css`
      @media (max-width: 900px) {
        display: none;
      }
    `}
`;

const NarrowSlot = styled.span`
  display: none;

  @media (max-width: 900px) {
    display: inline-flex;
  }
`;

const Decorated = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Lettering = styled.span<{ $decorated: boolean }>`
  display: inline-block;
  ${({ $decorated }) =>
    $decorated &&
    css`
      padding: 0.44em 0 0.26em;
    `}
  font-family: var(--cach-font-display);
  font-weight: 400;
  letter-spacing: 0.02em;
  color: currentColor;
  white-space: nowrap;
`;

const Rays = styled.svg`
  position: absolute;
  top: 0;
  left: 0.18em;
  width: 1.15em;
  height: 0.5em;
  overflow: visible;
`;

const Underline = styled.span`
  position: absolute;
  right: 0;
  bottom: 0.07em;
  left: 0;
  height: 0.13em;
  border-radius: 999px;
  background: ${brandVar('orange-500')};
  transform: rotate(-0.9deg);
  transform-origin: left center;
`;

const Isotipo = styled.svg<{ $dimension: number }>`
  display: block;
  flex: none;
  width: ${({ $dimension }) => $dimension}px;
  height: ${({ $dimension }) => $dimension}px;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

function RaysArt(): ReactNode {
  return (
    <Rays viewBox="0 0 26 12" fill="none" aria-hidden="true">
      <path
        d="M3 11 L7.5 4"
        stroke={brandVar('orange-500')}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M11 10.5 L15.5 3.5"
        stroke={brandVar('orange-500')}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M19 10 L23 4"
        stroke={brandVar('orange-500')}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </Rays>
  );
}

function LetteringLockup({ decorated }: { readonly decorated: boolean }): ReactNode {
  if (!decorated) {
    return (
      <Lettering $decorated={false} aria-hidden="true">
        {LETTERING}
      </Lettering>
    );
  }

  return (
    <Decorated aria-hidden="true">
      <RaysArt />
      <Lettering $decorated>{LETTERING}</Lettering>
      <Underline />
    </Decorated>
  );
}

function IsotipoArt({ dimension }: { readonly dimension: number }): ReactNode {
  return (
    <Isotipo
      $dimension={dimension}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="64" height="64" rx="16" fill={brandVar('green-900')} />
      <path
        d="M46 22 A 16 16 0 1 0 46 42"
        stroke={brandVar('orange-500')}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 16 L17 10"
        stroke={brandVar('mustard-500')}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 13 L25 7"
        stroke={brandVar('mustard-500')}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Isotipo>
  );
}

export interface BrandLogoProps {
  /** Visual variant: full `wordmark`, tighter `compact`, or icon `isotipo`. */
  readonly variant?: BrandLogoVariant;
  readonly size?: BrandLogoSize;
  /**
   * Only meaningful for the `wordmark` variant: swaps to the compact lockup
   * at viewports <= 900px so narrow headers keep a short brand row.
   */
  readonly responsive?: boolean;
  readonly className?: string;
  readonly label?: string;
}

export function BrandLogo({
  variant = 'wordmark',
  size,
  responsive = false,
  className,
  label,
}: BrandLogoProps): ReactNode {
  const { t } = useI18n();
  const name = label ?? t('brand.name');
  const resolvedSize: BrandLogoSize = size ?? (variant === 'compact' ? 'sm' : 'md');

  let art: ReactNode;
  if (variant === 'isotipo') {
    art = <IsotipoArt dimension={ISOTOPO_DIMENSION[resolvedSize]} />;
  } else if (variant === 'compact') {
    art = <LetteringLockup decorated={false} />;
  } else {
    art = (
      <>
        <DecoratedSlot $responsive={responsive}>
          <LetteringLockup decorated />
        </DecoratedSlot>
        {responsive ? (
          <NarrowSlot>
            <LetteringLockup decorated={false} />
          </NarrowSlot>
        ) : null}
      </>
    );
  }

  return (
    <Root $size={resolvedSize} role="img" aria-label={name} className={className}>
      {art}
      <VisuallyHidden>{name}</VisuallyHidden>
    </Root>
  );
}
