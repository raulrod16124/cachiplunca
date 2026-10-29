import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { publicAssetUrl } from '../config/public-base';
import { useI18n } from '../i18n';

export type BrandLogoVariant = 'wordmark' | 'compact' | 'isotipo';
export type BrandLogoSize = 'sm' | 'md' | 'lg';
export type BrandLogoTone = 'auto' | 'light' | 'dark';

const WORDMARK_WIDTH = 579;
const WORDMARK_HEIGHT = 264;
const REDUCED_SIZE = 256;

const WORDMARK_HEIGHTS: Record<BrandLogoSize, number> = {
  sm: 36,
  md: 52,
  lg: 64,
};

const REDUCED_DIMENSIONS: Record<BrandLogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
};

const LOGO_FILES = {
  light: {
    wordmark: 'light_theme_logo_cachiplunca.png',
    reduced: 'light_theme_logo_reducido_cachiplunca.png',
  },
  dark: {
    wordmark: 'dark_theme_logo_cachiplunca.png',
    reduced: 'dark_theme_logo_reducido_cachiplunca.png',
  },
} as const;

type LogoTheme = keyof typeof LOGO_FILES;
type LogoKind = keyof (typeof LOGO_FILES)[LogoTheme];

const Root = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  max-width: 100%;
  line-height: 1;
`;

const Mark = styled.img<{ $height?: number; $dimension?: number }>`
  display: block;
  flex: none;
  max-width: 100%;
  object-fit: contain;

  ${({ $height }) =>
    $height !== undefined &&
    css`
      width: ${Math.round(($height * WORDMARK_WIDTH) / WORDMARK_HEIGHT)}px;
      height: ${$height}px;
    `}

  ${({ $dimension }) =>
    $dimension !== undefined &&
    css`
      width: ${$dimension}px;
      height: ${$dimension}px;
    `}
`;

const ThemedMark = styled(Mark)<{ $theme: LogoTheme }>`
  ${({ $theme }) =>
    $theme === 'light'
      ? css`
          :root[data-theme='dark'] & {
            display: none;
          }

          @media (prefers-color-scheme: dark) {
            :root:not([data-theme]) & {
              display: none;
            }
          }
        `
      : css`
          display: none;

          :root[data-theme='dark'] & {
            display: block;
          }

          @media (prefers-color-scheme: dark) {
            :root:not([data-theme]) & {
              display: block;
            }
          }
        `}
`;

const WideOnly = styled.span`
  display: inline-flex;

  @media (max-width: 900px) {
    display: none;
  }
`;

const NarrowOnly = styled.span`
  display: none;

  @media (max-width: 900px) {
    display: inline-flex;
  }
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

function assetUrl(file: string): string {
  return publicAssetUrl(`brand/${file}`);
}

function intrinsicSize(kind: LogoKind): { width: number; height: number } {
  return kind === 'wordmark'
    ? { width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }
    : { width: REDUCED_SIZE, height: REDUCED_SIZE };
}

function markSize(
  kind: LogoKind,
  size: BrandLogoSize,
): { $height: number } | { $dimension: number } {
  return kind === 'wordmark'
    ? { $height: WORDMARK_HEIGHTS[size] }
    : { $dimension: REDUCED_DIMENSIONS[size] };
}

function ThemedArt({
  kind,
  size,
  tone,
}: {
  readonly kind: LogoKind;
  readonly size: BrandLogoSize;
  readonly tone: BrandLogoTone;
}): ReactNode {
  const intrinsic = intrinsicSize(kind);
  const dimensions = markSize(kind, size);

  if (tone !== 'auto') {
    return (
      <Mark
        {...dimensions}
        src={assetUrl(LOGO_FILES[tone][kind])}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={intrinsic.width}
        height={intrinsic.height}
      />
    );
  }

  return (
    <>
      <ThemedMark
        {...dimensions}
        $theme="light"
        src={assetUrl(LOGO_FILES.light[kind])}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={intrinsic.width}
        height={intrinsic.height}
      />
      <ThemedMark
        {...dimensions}
        $theme="dark"
        src={assetUrl(LOGO_FILES.dark[kind])}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={intrinsic.width}
        height={intrinsic.height}
      />
    </>
  );
}

export interface BrandLogoProps {
  readonly variant?: BrandLogoVariant;
  readonly size?: BrandLogoSize;
  readonly responsive?: boolean;
  readonly tone?: BrandLogoTone;
  readonly className?: string;
  readonly label?: string;
}

export function BrandLogo({
  variant = 'wordmark',
  size = 'md',
  responsive = false,
  tone = 'auto',
  className,
  label,
}: BrandLogoProps): ReactNode {
  const { t } = useI18n();
  const name = label ?? t('brand.name');

  let art: ReactNode;
  if (variant === 'wordmark' && responsive) {
    art = (
      <>
        <WideOnly>
          <ThemedArt kind="wordmark" size={size} tone={tone} />
        </WideOnly>
        <NarrowOnly>
          <ThemedArt kind="reduced" size={size} tone={tone} />
        </NarrowOnly>
      </>
    );
  } else {
    const kind: LogoKind = variant === 'wordmark' ? 'wordmark' : 'reduced';
    art = <ThemedArt kind={kind} size={size} tone={tone} />;
  }

  return (
    <Root role="img" aria-label={name} className={className}>
      {art}
      <VisuallyHidden>{name}</VisuallyHidden>
    </Root>
  );
}
