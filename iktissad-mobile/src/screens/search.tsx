import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { ArticleRow } from '@/components/article-card';
import { EmptyView, ErrorView, FooterSpinner, InlineError, LoadingView } from '@/components/state-views';
import { usePaged } from '@/hooks/use-paged';
import { api } from '@/lib/api';
import { fill, t } from '@/lib/strings';

export function SearchScreen() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  // Debounce typing; the search endpoint is the slowest public route.
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const enabled = q.length >= 2;
  const results = usePaged(['search', q], (page) => api.search(q, page), enabled);

  const header = (
    <Stack.Screen
      options={{
        title: t.tabs.search,
        headerSearchBarOptions: {
          placeholder: t.search.placeholder,
          hideWhenScrolling: false,
          onChangeText: (e) => setText(e.nativeEvent.text),
          onSearchButtonPress: (e) => {
            setText(e.nativeEvent.text);
            setQ(e.nativeEvent.text.trim());
          },
          onCancelButtonPress: () => setText(''),
        },
      }}
    />
  );

  let empty: React.ReactElement;
  if (!enabled) empty = <EmptyView message={t.search.prompt} />;
  else if (results.data === undefined && results.isError) empty = <ErrorView onRetry={() => results.refetch()} />;
  else if (results.data === undefined) empty = <LoadingView />;
  else empty = <EmptyView message={fill(t.search.noResults, { q })} />;

  return (
    <>
      {header}
      <FlatList
        data={enabled ? results.items : []}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleRow article={item} />}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={results.loadMore}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={empty}
        ListHeaderComponent={enabled && results.isRefetchError ? <InlineError onRetry={() => results.refetch()} /> : undefined}
        ListFooterComponent={
          results.isFetchNextPageError ? (
            <InlineError onRetry={results.loadMore} />
          ) : (
            <FooterSpinner visible={results.isFetchingNextPage} />
          )
        }
      />
    </>
  );
}
