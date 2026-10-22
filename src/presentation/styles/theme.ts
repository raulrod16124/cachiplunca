import { brandFontVar } from './brand/brand-tokens';
import { token } from './tokens';

const action = {
  primary: {
    background: token('color.action.primary.background'),
    backgroundHover: token('color.action.primary.background.hover'),
    backgroundActive: token('color.action.primary.background.active'),
    text: token('color.action.primary.text'),
  },
  secondary: {
    background: token('color.action.secondary.background'),
    backgroundHover: token('color.action.secondary.background.hover'),
    text: token('color.action.secondary.text'),
  },
  destructive: {
    background: token('color.action.destructive.background'),
    backgroundHover: token('color.action.destructive.background.hover'),
    text: token('color.action.destructive.text'),
  },
  disabled: {
    background: token('color.action.disabled.background'),
    text: token('color.action.disabled.text'),
  },
  success: {
    background: token('color.action.success.background'),
    backgroundHover: token('color.action.success.background.hover'),
    text: token('color.action.success.text'),
  },
  info: {
    background: token('color.action.info.background'),
    backgroundHover: token('color.action.info.background.hover'),
    text: token('color.action.info.text'),
  },
} as const;

/**
 * Application design tokens exposed to styled-components through
 * `props.theme`. Every value is a `var(--rr-*)` reference, so runtime themes
 * (light/dark) are resolved by the CSS custom properties emitted upstream.
 */
export const appTheme = {
  color: {
    background: {
      default: token('color.background.default'),
      surface: token('color.background.surface'),
      sunken: token('color.background.sunken'),
      success: token('color.background.success'),
      warning: token('color.background.warning'),
      info: token('color.background.info'),
      destructive: token('color.background.destructive'),
    },
    text: {
      primary: token('color.text.primary'),
      muted: token('color.text.muted'),
      inverse: token('color.text.inverse'),
      danger: token('color.text.danger'),
      destructive: token('color.text.destructive'),
      success: token('color.text.success'),
      warning: token('color.text.warning'),
      info: token('color.text.info'),
    },
    border: {
      default: token('color.border.default'),
      strong: token('color.border.strong'),
      danger: token('color.border.danger'),
      primary: token('color.border.primary'),
      primaryHover: token('color.border.primary.hover'),
    },
    action,
    link: {
      text: token('color.link.text'),
      hover: token('color.link.text.hover'),
    },
    focusRing: token('color.focus.ring'),
  },
  font: {
    family: {
      sans: token('font.family.sans'),
      mono: token('font.family.mono'),
      display: brandFontVar('font-display'),
    },
    size: {
      '2xs': token('font.size.2xs'),
      xs: token('font.size.xs'),
      sm: token('font.size.sm'),
      base: token('font.size.base'),
      lg: token('font.size.lg'),
      xl: token('font.size.xl'),
      '2xl': token('font.size.2xl'),
      '3xl': token('font.size.3xl'),
      '4xl': token('font.size.4xl'),
      '5xl': token('font.size.5xl'),
    },
    weight: {
      regular: token('font.weight.regular'),
      medium: token('font.weight.medium'),
      semibold: token('font.weight.semibold'),
      bold: token('font.weight.bold'),
    },
    leading: {
      none: token('font.leading.none'),
      tight: token('font.leading.tight'),
      normal: token('font.leading.normal'),
      relaxed: token('font.leading.relaxed'),
    },
    tracking: {
      tight: token('font.tracking.tight'),
      normal: token('font.tracking.normal'),
      wide: token('font.tracking.wide'),
    },
    numeric: {
      tabularNums: token('font.numeric.tabular-nums'),
    },
  },
  space: {
    0: token('space-0'),
    1: token('space-1'),
    2: token('space-2'),
    3: token('space-3'),
    4: token('space-4'),
    5: token('space-5'),
    6: token('space-6'),
    8: token('space-8'),
    10: token('space-10'),
    12: token('space-12'),
    16: token('space-16'),
  },
  radius: {
    none: token('radius-none'),
    sm: token('radius-sm'),
    md: token('radius-md'),
    lg: token('radius-lg'),
    full: token('radius-full'),
  },
  shadow: {
    sm: token('shadow.sm'),
    md: token('shadow.md'),
  },
  motion: {
    duration: {
      fast: token('motion.duration.fast'),
      base: token('motion.duration.base'),
      slow: token('motion.duration.slow'),
    },
    easing: {
      standard: token('motion.easing.standard'),
      enter: token('motion.easing.enter'),
      exit: token('motion.easing.exit'),
    },
    behavior: {
      default: token('motion.behavior.default'),
      reduced: token('motion.behavior.reduced'),
    },
  },
  z: {
    base: token('z.base'),
    overlay: token('z.overlay'),
    modal: token('z.modal'),
    toast: token('z.toast'),
  },
  // Canvas-specific aliases: the canvas has no tokens of its own, so it reuses
  // semantic roles to keep selection/grid/stroke drawing on the token layer.
  canvas: {
    grid: token('color.border.default'),
    selection: token('color.border.primary'),
    selectionFill: `color-mix(in srgb, ${token('color.action.primary.background')} 8%, transparent)`,
    board: 'var(--cach-canvas-surface)',
    surface: 'var(--cach-floating-surface)',
    surfaceMuted: 'var(--cach-floating-surface-muted)',
    elementBorder: token('color.border.default'),
    elementBorderSoft: `color-mix(in srgb, ${token('color.border.default')} 55%, transparent)`,
    elementBorderStrong: token('color.border.strong'),
    handleFill: token('color.background.default'),
    hintText: token('color.text.muted'),
  },
} as const;

export type AppTheme = typeof appTheme;

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
