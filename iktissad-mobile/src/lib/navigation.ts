import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router/stack';

import { colors, fonts } from '@/theme';

/**
 * Tab-root stacks. Standard (not large) titles: UIKit's large title renders
 * Arabic reversed and unshaped when the app forces RTL on a non-Arabic device.
 */
export const tabStackOptions: ComponentProps<typeof Stack>['screenOptions'] = {
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.bold },
  headerBackButtonDisplayMode: 'minimal',
  // direction: RTL inside Expo Go too, where native RTL can't be forced (see lib/rtl.ts).
  contentStyle: { backgroundColor: colors.background, direction: 'rtl' },
};
