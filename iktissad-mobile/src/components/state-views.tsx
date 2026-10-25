import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { brand, colors, spacing } from '@/theme';
import { t } from '@/lib/strings';

export function LoadingView() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <ActivityIndicator color={brand.navy} />
    </View>
  );
}

export function ErrorView({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
      <AppText variant="subhead" muted selectable style={{ textAlign: 'center' }}>
        {message ?? t.common.loadError}
      </AppText>
      <RetryButton onPress={onRetry} />
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl }}>
      <AppText variant="subhead" muted style={{ textAlign: 'center' }}>
        {message}
      </AppText>
    </View>
  );
}

/** Non-blocking banner: a refresh failed but cached content is still shown. */
export function InlineError({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        margin: spacing.md,
        padding: spacing.md,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: colors.secondaryBackground,
      }}>
      <AppText variant="caption" muted style={{ flex: 1 }}>
        {t.common.refreshError}
      </AppText>
      <AppText variant="label" style={{ color: brand.blue }}>
        {t.common.retry}
      </AppText>
    </Pressable>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        borderRadius: 999,
        backgroundColor: brand.navy,
        opacity: pressed ? 0.8 : 1,
      })}>
      <AppText variant="label" style={{ color: 'white' }}>
        {t.common.retry}
      </AppText>
    </Pressable>
  );
}

export function FooterSpinner({ visible }: { visible: boolean }) {
  if (!visible) return <View style={{ height: spacing.xl }} />;
  return (
    <View style={{ padding: spacing.lg }}>
      <ActivityIndicator color={brand.navy} />
    </View>
  );
}
