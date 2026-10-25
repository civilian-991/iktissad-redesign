import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { brand, spacing } from '@/theme';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
      <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: brand.gold }} />
      <AppText variant="title" accessibilityRole="header">
        {children}
      </AppText>
    </View>
  );
}
