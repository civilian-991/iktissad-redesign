import { I18nManager } from 'react-native';

/**
 * The app is Arabic-only and always right-to-left.
 *
 * Installed builds force native RTL from the first launch (`forcesRTL` in
 * app.json), which also mirrors headers, tabs and back gestures. Expo Go
 * cannot force RTL, so every screen also sets `direction: 'rtl'` on its root,
 * and text is aligned to the physical right in both cases: with native RTL
 * React Native swaps 'left'/'right', without it they are literal.
 */
export const RIGHT = (I18nManager.isRTL ? 'left' : 'right') as 'left' | 'right';
export const rtlRoot = { direction: 'rtl' } as const;
