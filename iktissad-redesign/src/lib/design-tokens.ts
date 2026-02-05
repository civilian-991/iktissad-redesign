/**
 * IKTISSAD Design System - Design Tokens
 *
 * Centralized design tokens for consistent styling across the application.
 * These values mirror the CSS custom properties in globals.css
 *
 * Usage:
 * import { colors, spacing, typography } from '@/lib/design-tokens';
 */

// ═══════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Primary Brand Blues
  brand: {
    950: '#001a33',
    900: '#002647',
    800: '#003a6b',
    700: '#004d8f',
    DEFAULT: '#005B9F',
    500: '#0073c7',
    400: '#2b8fd9',
    300: '#5aabeb',
    200: '#9dcaf5',
    100: '#d4e9fc',
    50: '#eef6fd',
  },

  // Accent Amber/Gold
  accent: {
    700: '#b45309',
    600: '#d97706',
    DEFAULT: '#f59e0b',
    400: '#fbbf24',
    300: '#fcd34d',
    200: '#fde68a',
    100: '#fef3c7',
  },

  // Neutrals - Slate
  slate: {
    950: '#020617',
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },

  // Semantic Colors
  semantic: {
    profit: '#059669',
    profitLight: '#10b981',
    profitBg: '#ecfdf5',
    loss: '#dc2626',
    lossLight: '#ef4444',
    lossBg: '#fef2f2',
    warning: '#d97706',
    warningLight: '#f59e0b',
    warningBg: '#fffbeb',
    info: '#005B9F',
    infoLight: '#2b8fd9',
    infoBg: '#eef6fd',
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
    burgundy: '#991b1b',
    gold: '#f59e0b',
    goldBright: '#fbbf24',
    goldLight: '#fcd34d',
    goldMuted: '#d97706',
    copper: '#ea580c',
    bronze: '#c2410c',
  },

  // Paper/Background
  paper: {
    DEFAULT: '#ffffff',
    warm: '#f8fafc',
    cream: '#f1f5f9',
    ivory: '#e2e8f0',
  },

  // Text Colors
  text: {
    ink: '#0f172a',
    inkSoft: '#1e293b',
    charcoal: '#334155',
    graphite: '#475569',
    pewter: '#64748b',
    silver: '#94a3b8',
  },

  // Overlays (for use with rgba)
  overlay: {
    light: 'rgba(255, 255, 255, 0.95)',
    dark: 'rgba(15, 23, 42, 0.92)',
    brand: 'rgba(0, 91, 159, 0.95)',
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
    hero: 'clamp(2.75rem, 6vw, 5rem)',
    h1: 'clamp(2.5rem, 5vw, 4rem)',
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
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.8,
    loose: 1.9,
  },

  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0.01em',
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
    x: '2.5rem',
    y: '1rem',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════════

export const shadows = {
  subtle: '0 1px 2px rgba(15, 23, 42, 0.05)',
  card: '0 4px 16px rgba(15, 23, 42, 0.08)',
  elevated: '0 10px 40px rgba(15, 23, 42, 0.12)',
  dramatic: '0 20px 60px rgba(15, 23, 42, 0.18)',
  gold: '0 4px 20px rgba(245, 158, 11, 0.25)',
  blue: '0 4px 20px rgba(0, 91, 159, 0.25)',
  inner: 'inset 0 2px 4px rgba(15, 23, 42, 0.05)',
  glowBrand: '0 0 30px rgba(0, 91, 159, 0.25)',
  glowGold: '0 0 30px rgba(245, 158, 11, 0.25)',
} as const;

// ═══════════════════════════════════════════════════════════════
// BORDERS & RADII
// ═══════════════════════════════════════════════════════════════

export const borders = {
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
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
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

export const animations = {
  duration: {
    instant: '0.1s',
    fast: '0.2s',
    medium: '0.35s',
    slow: '0.6s',
    slower: '0.8s',
  },
  durationMs: {
    instant: 100,
    fast: 200,
    medium: 350,
    slow: 600,
    slower: 800,
  },
  easing: {
    editorial: 'cubic-bezier(0.19, 1, 0.22, 1)',
    snap: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
// CONFIGURATION CONSTANTS (Previously Magic Numbers)
// ═══════════════════════════════════════════════════════════════

export const config = {
  // Carousel/Slider
  carousel: {
    autoPlayInterval: 7000, // ms
    transitionDuration: 700, // ms
    slideDelay: 200, // ms between slide content animation
  },

  // Ticker
  ticker: {
    animationDuration: 30, // seconds
    pauseOnHover: true,
  },

  // Pagination
  pagination: {
    sectorsPerPage: 6,
    articlesPerPage: 10,
    usersPerPage: 10,
  },

  // Newsletter
  newsletter: {
    submissionTimeout: 3000, // ms
  },

  // Animation Stagger
  stagger: {
    fast: 0.05, // seconds between items
    normal: 0.1,
    slow: 0.15,
  },

  // Submenu
  submenu: {
    wideWidth: '480px',
    normalWidth: '224px', // w-56 in tailwind
  },

  // Mobile Menu
  mobileMenu: {
    width: '320px', // w-80 in tailwind
  },

  // Search Modal
  searchModal: {
    maxWidth: '768px', // max-w-3xl
  },

  // Featured Article Heights
  article: {
    featuredHeight: '400px',
    cardHeight: '208px', // h-52
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

/**
 * Get color with opacity
 * @param hex - Hex color value
 * @param opacity - Opacity value (0-1)
 */
export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get responsive value based on breakpoint
 */
export function responsive<T>(values: { base: T; sm?: T; md?: T; lg?: T; xl?: T }): T {
  // This is a placeholder - actual implementation would depend on context
  return values.base;
}

/**
 * Create CSS custom property reference
 */
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

// Default export for convenience
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
