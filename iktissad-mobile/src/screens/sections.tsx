import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyView, ErrorView, InlineError, LoadingView } from '@/components/state-views';
import { api } from '@/lib/api';
import { plainText } from '@/lib/content';
import { brand, colors, spacing } from '@/theme';
import { t } from '@/lib/strings';

export function SectionsScreen() {
  const query = useQuery({ queryKey: ['sections'], queryFn: api.sections, staleTime: 60 * 60_000 });

  const header = <Stack.Screen options={{ title: t.sections.title }} />;
  if (query.data === undefined) {
    return (
      <>
        {header}
        {query.isError ? <ErrorView onRetry={() => query.refetch()} /> : <LoadingView />}
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        data={query.data.filter((s) => (s.articleCount ?? 1) > 0)}
        keyExtractor={(s) => s.id}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={brand.navy} />}
        ListHeaderComponent={query.isRefetchError ? <InlineError onRetry={() => query.refetch()} /> : undefined}
        ListEmptyComponent={<EmptyView message={t.common.empty} />}
        renderItem={({ item }) => {
          const name = plainText(item.name);
          const description = plainText(item.description);
          return (
            <Link href={{ pathname: '/section/[slug]', params: { slug: item.slug, name } }} asChild>
              <Pressable>
                {({ pressed }) => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.separator,
                      backgroundColor: pressed ? colors.secondaryBackground : colors.background,
                    }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="title">{name}</AppText>
                      {description ? (
                        <AppText variant="caption" muted numberOfLines={2}>
                          {description}
                        </AppText>
                      ) : null}
                    </View>
                    <SymbolView
                      name="chevron.left"
                      size={14}
                      tintColor={colors.tertiaryLabel as string}
                      fallback={<AppText muted>‹</AppText>}
                    />
                  </View>
                )}
              </Pressable>
            </Link>
          );
        }}
      />
    </>
  );
}
