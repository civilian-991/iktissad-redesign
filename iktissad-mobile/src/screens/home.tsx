import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router/stack';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { ArticleRow, CompactCard, LeadCard } from '@/components/article-card';
import { SectionTitle } from '@/components/section-title';
import { EmptyView, ErrorView, FooterSpinner, InlineError, LoadingView } from '@/components/state-views';
import { usePaged } from '@/hooks/use-paged';
import { api } from '@/lib/api';
import { brand, spacing } from '@/theme';
import { t } from '@/lib/strings';

export function HomeScreen() {
  const top = useQuery({ queryKey: ['top'], queryFn: () => api.topStories(7) });
  const latest = usePaged(['latest'], (page) => api.latest(page));

  const topIds = new Set((top.data ?? []).map((a) => a.id));
  const feed = latest.items.filter((a) => !topIds.has(a.id));
  const [lead, ...carousel] = top.data ?? [];

  const refresh = () => {
    top.refetch();
    latest.refetch();
  };

  const header = (
    <Stack.Screen
      options={{
        title: t.tabs.home,
        headerLargeTitleEnabled: false,
        headerTitle: () => (
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 150, height: 25 }}
            contentFit="contain"
            accessibilityLabel="الاقتصاد والأعمال"
          />
        ),
      }}
    />
  );

  if (latest.data === undefined && top.data === undefined) {
    return (
      <>
        {header}
        {latest.isError && top.isError ? <ErrorView onRetry={refresh} /> : <LoadingView />}
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        data={feed}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleRow article={item} />}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={latest.loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl refreshing={latest.isRefetching || top.isRefetching} onRefresh={refresh} tintColor={brand.navy} />
        }
        ListHeaderComponent={
          <View>
            {(latest.isRefetchError || top.isRefetchError) && <InlineError onRetry={refresh} />}
            {lead ? <LeadCard article={lead} /> : null}
            {carousel.length > 0 && (
              <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
                <SectionTitle>{t.home.featured}</SectionTitle>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}>
                  {carousel.map((a) => (
                    <CompactCard key={a.id} article={a} width={220} />
                  ))}
                </ScrollView>
              </View>
            )}
            <SectionTitle>{t.home.latest}</SectionTitle>
          </View>
        }
        ListEmptyComponent={latest.isError ? <InlineError onRetry={refresh} /> : latest.isLoading ? <LoadingView /> : <EmptyView message={t.common.empty} />}
        ListFooterComponent={<FooterSpinner visible={latest.isFetchingNextPage} />}
      />
    </>
  );
}
