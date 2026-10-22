import { brandPrimitives } from './brand-tokens';

export type BrandTheme = 'light' | 'dark';

export type ContrastPairKind = 'text' | 'non-text';

export interface BrandContrastPair {
  readonly id: string;
  readonly theme: BrandTheme;
  readonly foreground: string;
  readonly background: string;
  readonly kind: ContrastPairKind;
  readonly where: string;
}

export const TEXT_CONTRAST_MIN = 4.5;

export const NON_TEXT_CONTRAST_MIN = 3;

const COLOR_HEX_RE = /^#[0-9a-f]{6}$/i;

export function requiredContrast(kind: ContrastPairKind): number {
  return kind === 'text' ? TEXT_CONTRAST_MIN : NON_TEXT_CONTRAST_MIN;
}

function parseHex(hex: string): readonly [number, number, number] {
  const match = COLOR_HEX_RE.exec(hex);
  if (match === null) {
    throw new Error(`"${hex}" is not a #RRGGBB hex color`);
  }

  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toLinearChannel(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex);

  return (
    0.2126 * toLinearChannel(red) + 0.7152 * toLinearChannel(green) + 0.0722 * toLinearChannel(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

const dark = {
  backgroundDefault: '#14201b',
  backgroundSurface: '#1b2a23',
  backgroundSunken: '#243830',
  textMuted: '#b9c0ae',
  borderDefault: '#5e7265',
  actionSecondaryBackground: '#2b3b32',
  linkText: '#ff9a5c',
} as const;

const noteColors = {
  light: {
    green: '#dce8cf',
    amber: '#f7e3b0',
    blue: '#d8e4e8',
    red: '#f6d5c8',
    gray: '#efe6d8',
  },
  dark: {
    green: '#2c4034',
    amber: '#4a3d1f',
    blue: '#24383c',
    red: '#4a2c25',
    gray: '#3a3428',
  },
} as const;

function textPair(
  id: string,
  theme: BrandTheme,
  foreground: string,
  background: string,
  where: string,
): BrandContrastPair {
  return { id, theme, foreground, background, kind: 'text', where };
}

function uiPair(
  id: string,
  theme: BrandTheme,
  foreground: string,
  background: string,
  where: string,
): BrandContrastPair {
  return { id, theme, foreground, background, kind: 'non-text', where };
}

export const BRAND_CONTRAST_PAIRS: readonly BrandContrastPair[] = [
  textPair(
    'light.text-primary-on-default',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['white'],
    'body copy on the page',
  ),
  textPair(
    'light.text-primary-on-surface',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['white'],
    'body copy on cards, dialogs and drawers',
  ),
  textPair(
    'light.text-primary-on-sunken',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['neutral-100'],
    'body copy on neutral panels',
  ),
  textPair(
    'light.text-muted-on-default',
    'light',
    brandPrimitives['muted-600'],
    brandPrimitives['white'],
    'secondary copy on the page',
  ),
  textPair(
    'light.text-muted-on-surface',
    'light',
    brandPrimitives['muted-600'],
    brandPrimitives['white'],
    'secondary copy on cards, dialogs and drawers',
  ),
  textPair(
    'light.text-muted-on-sunken',
    'light',
    brandPrimitives['muted-600'],
    brandPrimitives['neutral-100'],
    'secondary copy on neutral panels',
  ),
  textPair(
    'light.action-primary-text',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-900'],
    'primary button label',
  ),
  textPair(
    'light.action-primary-text-hover',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-950'],
    'primary button label on hover',
  ),
  textPair(
    'light.action-primary-text-active',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-980'],
    'primary button label while active',
  ),
  textPair(
    'light.action-secondary-text',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['orange-500'],
    'secondary button label',
  ),
  textPair(
    'light.action-destructive-text',
    'light',
    brandPrimitives['white'],
    brandPrimitives['error-700'],
    'destructive button label',
  ),
  textPair(
    'light.action-success-text',
    'light',
    brandPrimitives['white'],
    brandPrimitives['success-700'],
    'success badge and button label',
  ),
  textPair(
    'light.action-info-text',
    'light',
    brandPrimitives['white'],
    brandPrimitives['info-700'],
    'info badge and button label',
  ),
  textPair(
    'light.link-on-default',
    'light',
    brandPrimitives['green-900'],
    brandPrimitives['white'],
    'link on the page',
  ),
  textPair(
    'light.link-hover-on-default',
    'light',
    brandPrimitives['green-950'],
    brandPrimitives['white'],
    'link on hover',
  ),
  uiPair(
    'light.focus-ring-on-default',
    'light',
    brandPrimitives['green-900'],
    brandPrimitives['white'],
    'focus ring on the page',
  ),
  uiPair(
    'light.focus-ring-on-surface',
    'light',
    brandPrimitives['green-900'],
    brandPrimitives['white'],
    'focus ring on cards, dialogs and drawers',
  ),
  uiPair(
    'light.border-default-on-default',
    'light',
    brandPrimitives['sand-600'],
    brandPrimitives['white'],
    'input and control boundary',
  ),
  uiPair(
    'light.border-strong-on-default',
    'light',
    brandPrimitives['brown-700'],
    brandPrimitives['white'],
    'strong element boundary',
  ),
  uiPair(
    'light.border-primary-on-default',
    'light',
    brandPrimitives['green-900'],
    brandPrimitives['white'],
    'selected control boundary',
  ),
  textPair(
    'light.text-primary-on-board',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['board-green-100'],
    'element text on the board canvas',
  ),
  textPair(
    'light.text-muted-on-board',
    'light',
    brandPrimitives['muted-600'],
    brandPrimitives['board-green-100'],
    'canvas hint copy on the board',
  ),
  uiPair(
    'light.grid-on-board',
    'light',
    brandPrimitives['sand-600'],
    brandPrimitives['board-green-100'],
    'board grid lines',
  ),
  textPair(
    'light.nav-active-text',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-900'],
    'active navigation label',
  ),
  uiPair(
    'light.nav-accent-on-active',
    'light',
    brandPrimitives['mustard-500'],
    brandPrimitives['green-900'],
    'active navigation accent',
  ),
  textPair(
    'light.card-icon-green',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-900'],
    'card icon on a green tile',
  ),
  textPair(
    'light.card-icon-peach',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['orange-500'],
    'card icon on an orange tile',
  ),
  textPair(
    'light.card-icon-mustard',
    'light',
    brandPrimitives['graphite-900'],
    brandPrimitives['mustard-500'],
    'card icon on a mustard tile',
  ),
  textPair(
    'light.empty-state-icon',
    'light',
    brandPrimitives['white'],
    brandPrimitives['green-900'],
    'empty-state icon on its green tile',
  ),
  textPair(
    'dark.text-primary-on-default',
    'dark',
    brandPrimitives['cream-50'],
    dark.backgroundDefault,
    'body copy on the page',
  ),
  textPair(
    'dark.text-primary-on-surface',
    'dark',
    brandPrimitives['cream-50'],
    dark.backgroundSurface,
    'body copy on cards and dialogs',
  ),
  textPair(
    'dark.text-primary-on-sunken',
    'dark',
    brandPrimitives['cream-50'],
    dark.backgroundSunken,
    'body copy on sunken panels',
  ),
  textPair(
    'dark.text-muted-on-default',
    'dark',
    dark.textMuted,
    dark.backgroundDefault,
    'secondary copy on the page',
  ),
  textPair(
    'dark.text-muted-on-surface',
    'dark',
    dark.textMuted,
    dark.backgroundSurface,
    'secondary copy on cards',
  ),
  textPair(
    'dark.action-primary-text',
    'dark',
    brandPrimitives['graphite-900'],
    brandPrimitives['mustard-500'],
    'primary button label',
  ),
  textPair(
    'dark.action-primary-text-hover',
    'dark',
    brandPrimitives['graphite-900'],
    brandPrimitives['mustard-600'],
    'primary button label on hover',
  ),
  textPair(
    'dark.action-secondary-text',
    'dark',
    brandPrimitives['cream-50'],
    dark.actionSecondaryBackground,
    'secondary button label',
  ),
  textPair(
    'dark.action-destructive-text',
    'dark',
    brandPrimitives['cream-50'],
    brandPrimitives['error-700'],
    'destructive button label',
  ),
  textPair(
    'dark.link-on-default',
    'dark',
    dark.linkText,
    dark.backgroundDefault,
    'link on the page',
  ),
  textPair(
    'dark.link-hover-on-default',
    'dark',
    brandPrimitives['mustard-500'],
    dark.backgroundDefault,
    'link on hover',
  ),
  uiPair(
    'dark.focus-ring-on-default',
    'dark',
    brandPrimitives['mustard-500'],
    dark.backgroundDefault,
    'focus ring on the page',
  ),
  uiPair(
    'dark.focus-ring-on-surface',
    'dark',
    brandPrimitives['mustard-500'],
    dark.backgroundSurface,
    'focus ring on cards and dialogs',
  ),
  uiPair(
    'dark.border-default-on-default',
    'dark',
    dark.borderDefault,
    dark.backgroundDefault,
    'input and control boundary',
  ),
  uiPair(
    'dark.border-strong-on-default',
    'dark',
    brandPrimitives['olive-500'],
    dark.backgroundDefault,
    'strong element boundary',
  ),
  textPair(
    'light.note-text-on-green',
    'light',
    brandPrimitives['graphite-900'],
    noteColors.light.green,
    'note copy on a green sticky note',
  ),
  textPair(
    'light.note-text-on-amber',
    'light',
    brandPrimitives['graphite-900'],
    noteColors.light.amber,
    'note copy on an amber sticky note',
  ),
  textPair(
    'light.note-text-on-blue',
    'light',
    brandPrimitives['graphite-900'],
    noteColors.light.blue,
    'note copy on a blue sticky note',
  ),
  textPair(
    'light.note-text-on-red',
    'light',
    brandPrimitives['graphite-900'],
    noteColors.light.red,
    'note copy on a red sticky note',
  ),
  textPair(
    'light.note-text-on-gray',
    'light',
    brandPrimitives['graphite-900'],
    noteColors.light.gray,
    'note copy on a gray sticky note',
  ),
  textPair(
    'dark.note-text-on-green',
    'dark',
    brandPrimitives['cream-50'],
    noteColors.dark.green,
    'note copy on a green sticky note',
  ),
  textPair(
    'dark.note-text-on-amber',
    'dark',
    brandPrimitives['cream-50'],
    noteColors.dark.amber,
    'note copy on an amber sticky note',
  ),
  textPair(
    'dark.note-text-on-blue',
    'dark',
    brandPrimitives['cream-50'],
    noteColors.dark.blue,
    'note copy on a blue sticky note',
  ),
  textPair(
    'dark.note-text-on-red',
    'dark',
    brandPrimitives['cream-50'],
    noteColors.dark.red,
    'note copy on a red sticky note',
  ),
  textPair(
    'dark.note-text-on-gray',
    'dark',
    brandPrimitives['cream-50'],
    noteColors.dark.gray,
    'note copy on a gray sticky note',
  ),
];
