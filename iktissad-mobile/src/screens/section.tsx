import { Stack } from 'expo-router/stack';
import { FlatList, RefreshControl } from 'react-native';

import { ArticleRow, LeadCard } from '@/components/article-card';
import { EmptyView, ErrorView, FooterSpinner, InlineError, LoadingView } from '@/components/state-views';
import { usePaged } from '@/hooks/use-paged';
import { api, type Section } from '@/lib/api';
import { plainText } from '@/lib/content';
import { brand } from '@/theme';
import { t } from '@/lib/strings';

export function SectionScreen({ slug, initialTitle }: { slug: string; initialTitle?: string }) {
  const list = usePaged(['section', slug], (page) => api.section(slug, page));
  const section: Section | undefined = list.data?.pages[0]?.section;
  const title = section ? plainText(section.name) : (initialTitle ?? '');

  const header = <Stack.Screen options={{ title }} />;
  if (list.data === undefined) {
    return (
      <>
        {header}
        {list.isError ? <ErrorView onRetry={() => list.refetch()} /> : <LoadingView />}
      </>
    );
  }

  const [lead, ...rest] = list.items;
  return (
    <>
      {header}
      <FlatList
        data={rest}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleRow article={item} />}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={brand.navy} />}
        ListHeaderComponent={
          <>
            {list.isRefetchError && <InlineError onRetry={() => list.refetch()} />}
            {lead ? <LeadCard article={lead} /> : null}
          </>
        }
        ListEmptyComponent={lead ? undefined : <EmptyView message={t.common.empty} />}
        ListFooterComponent={
          list.isFetchNextPageError ? (
            <InlineError onRetry={list.loadMore} />
          ) : (
            <FooterSpinner visible={list.isFetchingNextPage} />
          )
        }
      />
    </>
  );
}
