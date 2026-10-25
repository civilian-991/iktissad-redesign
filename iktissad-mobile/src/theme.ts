/** Brand palette, mirrored from the website's globals.css @theme block. */
export const brand = {
  navy: '#183B4E',
  navyDark: '#102735',
  blue: '#27548A',
  gold: '#C49240',
  goldDark: '#A17A30',
  cream: '#F5EEDC',
} as const;

/** Light mode only (app.json userInterfaceStyle: "light"), so plain hex, never system colours. */
export const colors = {
  label: '#111111',
  secondaryLabel: '#5B6168',
  tertiaryLabel: '#8A8F96',
  separator: '#E3E5E8',
  background: '#FFFFFF',
  secondaryBackground: '#F3F4F6',
  accent: brand.gold,
  tint: brand.blue,
};

export const fonts = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  extraBold: 'Tajawal_800ExtraBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const MaxContentWidth = 720;
