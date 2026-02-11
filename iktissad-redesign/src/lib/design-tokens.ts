/**
 * IKTISSAD Design System - Design Tokens
 * Deep Navy + Champagne Gold — Classic Financial Authority
 *
 * These values mirror the CSS custom properties in globals.css
 */

// ═══════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Navy Scale (deep, rich blues)
  brand: {
    950: '#0A1628',
    900: '#0F1D32',
    800: '#15253E',
    700: '#1B2A4A',
    DEFAULT: '#1B2A4A',
    500: '#2E4263',
    400: '#3D5579',
    300: '#5A7499',
    200: '#8CA3BF',
    100: '#C2D1E0',
    50: '#EDF1F5',
  },

  // Champagne Gold Scale
  accent: {
    700: '#8B7340',
    600: '#A6894B',
    DEFAULT: '#C5A55A',
    400: '#D4B872',
    300: '#DFC98E',
    200: '#EBDBAF',
    100: '#F5EDD5',
  },

  // Warm Neutrals (with blue hint)
  slate: {
    950: '#0F1D32',
    900: '#1A2438',
    800: '#2A3344',
    700: '#3D4A5C',
    600: '#546172',
    500: '#6E7B8B',
    400: '#8F9AAA',
    300: '#B5BEC8',
    200: '#D5DAE0',
    100: '#ECEEF2',
    50: '#F6F7F9',
  },

  // Semantic Colors
  semantic: {
    profit: '#059669',
    profitLight: '#10b981',
    profitBg: '#ecfdf5',
    loss: '#dc2626',
    lossLight: '#ef4444',
    lossBg: '#fef2f2',
    warning: '#A6894B',
    warningLight: '#C5A55A',
    warningBg: '#F5EDD5',
    info: '#4A6FA5',
    infoLight: '#6B8FBF',
    infoBg: '#EDF1F5',
  },

  // Social Media Brand Colors
  social: {
    facebook: '#1877f2',
    twitter: '#1da1f2',
    linkedin: '#0a66c2',
    whatsapp: '#25d366',
    telegram: '#0088cc',
    youtube: '#ff0000',
    instagram: '#e4405f',
  },

  // Special Colors
  special: {
    teal: '#0d9488',
    burgundy: '#7A1B1B',
    gold: '#C5A55A',
    goldBright: '#D4B872',
    goldLight: '#DFC98E',
    goldMuted: '#A6894B',
    copper: '#B8956A',
    bronze: '#9A7B50',
  },

  // Paper/Background
  paper: {
    DEFAULT: '#FAFBFC',
    warm: '#F8F9FB',
    cream: '#F2F4F7',
    ivory: '#ECEEF2',
  },

  // Text Colors
  text: {
    ink: '#1A2438',
    inkSoft: '#2A3344',
    charcoal: '#3D4A5C',
    graphite: '#546172',
    pewter: '#6E7B8B',
    silver: '#8F9AAA',
  },

  // Overlays
  overlay: {
    light: 'rgba(250, 251, 252, 0.95)',
    dark: 'rgba(15, 29, 50, 0.94)',
    brand: 'rgba(15, 29, 50, 0.95)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: {
    display: "'Tajawal', 'system-ui', sans-serif",
    body: "'Tajawal', 'system-ui', sans-serif",
    accent: "'Playfair Display', serif",
  },

  fontSize: {
    xs: '0.65rem',
    sm: '0.7rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '1.75rem',
    '3xl': '2.5rem',
    '4xl': '3rem',
    '5xl': '4rem',
    hero: 'clamp(3rem, 6vw, 5.5rem)',
    h1: 'clamp(2.75rem, 5.5vw, 4.5rem)',
    h2: 'clamp(1.75rem, 3vw, 2.5rem)',
    h3: 'clamp(1.25rem, 2vw, 1.5rem)',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    tight: 1.05,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 1.8,
  },

  letterSpacing: {
    tighter: '-0.03em',
    tight: '-0.025em',
    normal: '0.015em',
    wide: '0.02em',
    wider: '0.05em',
    widest: '0.1em',
    spaced: '0.2em',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SPACING
// ═══════════════════════════════════════════════════════════════

export const spacing = {
  // Base scale (in rem)
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',

  // Semantic spacing
  section: '6rem',
  container: '2rem',
  card: '1.5rem',
  input: '1rem',
  button: {
    x: '2rem',
    y: '0.75rem',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SHADOWS — Navy-tinted for cohesion
// ═══════════════════════════════════════════════════════════════

export const shadows = {
  subtle: '0 1px 2px rgba(15, 29, 50, 0.04)',
  card: '0 2px 8px rgba(15, 29, 50, 0.06)',
  elevated: '0 8px 30px rgba(15, 29, 50, 0.08)',
  dramatic: '0 16px 50px rgba(15, 29, 50, 0.12)',
  gold: '0 4px 20px rgba(197, 165, 90, 0.15)',
  blue: '0 4px 20px rgba(27, 42, 74, 0.15)',
  inner: 'inset 0 1px 3px rgba(15, 29, 50, 0.04)',
  glowBrand: '0 0 30px rgba(15, 29, 50, 0.15)',
  glowGold: '0 0 30px rgba(197, 165, 90, 0.18)',
} as const;

// ═══════════════════════════════════════════════════════════════
// BORDERS & RADII — Sharp, minimal
// ═══════════════════════════════════════════════════════════════

export const borders = {
  radius: {
    none: '0',
    sm: '2px',
    md: '3px',
    lg: '4px',
    xl: '6px',
    '2xl': '8px',
    full: '9999px',
  },
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '3px',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS — Slower, more deliberate
// ═══════════════════════════════════════════════════════════════

export const animations = {
  duration: {
    instant: '0.1s',
    fast: '0.25s',
    medium: '0.4s',
    slow: '0.7s',
    slower: '1s',
  },
  durationMs: {
    instant: 100,
    fast: 250,
    medium: 400,
    slow: 700,
    slower: 1000,
  },
  easing: {
    editorial: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    snap: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// BREAKPOINTS
// ═══════════════════════════════════════════════════════════════

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
} as const;

export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
} as const;

// ═══════════════════════════════════════════════════════════════
// CONTAINER WIDTHS
// ═══════════════════════════════════════════════════════════════

export const containers = {
  editorial: '1440px',
  luxury: '1400px',
  content: '1200px',
  narrow: '800px',
} as const;

// ═══════════════════════════════════════════════════════════════
// Z-INDEX LAYERS
// ═══════════════════════════════════════════════════════════════

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  max: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const config = {
  carousel: {
    autoPlayInterval: 7000,
    transitionDuration: 700,
    slideDelay: 200,
  },
  ticker: {
    animationDuration: 30,
    pauseOnHover: true,
  },
  pagination: {
    sectorsPerPage: 6,
    articlesPerPage: 10,
    usersPerPage: 10,
  },
  newsletter: {
    submissionTimeout: 3000,
  },
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
  submenu: {
    wideWidth: '480px',
    normalWidth: '224px',
  },
  mobileMenu: {
    width: '320px',
  },
  searchModal: {
    maxWidth: '768px',
  },
  article: {
    featuredHeight: '400px',
    cardHeight: '208px',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ICON SIZES
// ═══════════════════════════════════════════════════════════════

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ═══════════════════════════════════════════════════════════════
// COMPONENT VARIANTS
// ═══════════════════════════════════════════════════════════════

export const buttonVariants = {
  primary: 'gold',
  secondary: 'dark',
  outline: 'outline',
  ghost: 'ghost',
  danger: 'danger',
} as const;

export const badgeVariants = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  premium: 'premium',
} as const;

export const inputVariants = {
  default: 'default',
  filled: 'filled',
  outline: 'outline',
} as const;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function responsive<T>(values: { base: T; sm?: T; md?: T; lg?: T; xl?: T }): T {
  return values.base;
}

export function cssVar(name: string): string {
  return `var(--${name})`;
}

// ═══════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type BreakpointKey = keyof typeof breakpoints;
export type ShadowKey = keyof typeof shadows;
export type FontSizeKey = keyof typeof typography.fontSize;
export type ButtonVariant = keyof typeof buttonVariants;
export type BadgeVariant = keyof typeof badgeVariants;
export type InputVariant = keyof typeof inputVariants;

// Default export
const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  borders,
  animations,
  breakpoints,
  breakpointValues,
  containers,
  zIndex,
  config,
  iconSizes,
  buttonVariants,
  badgeVariants,
  inputVariants,
  withOpacity,
  responsive,
  cssVar,
};

export default designTokens;
