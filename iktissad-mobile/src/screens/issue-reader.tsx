import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { FlatList, ScrollView, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyView, ErrorView, LoadingView } from '@/components/state-views';
import { api } from '@/lib/api';
import { formatMonthYear } from '@/lib/format';
import { fill, t } from '@/lib/strings';
import { spacing } from '@/theme';

export function IssueReaderScreen({ id }: { id: string }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const query = useQuery({ queryKey: ['issue', id], queryFn: () => api.issue(id), staleTime: 60 * 60_000 });

  const issue = query.data;
  const title = issue?.issueNumber
    ? `${fill(t.magazine.issue, { n: issue.issueNumber })} · ${formatMonthYear(issue.publishDate)}`
    : '';
  const header = (
    <Stack.Screen
      options={{
        title,
        contentStyle: { backgroundColor: '#111' },
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
      }}
    />
  );

  if (!issue) {
    return (
      <>
        {header}
        {query.isError ? <ErrorView onRetry={() => query.refetch()} /> : <LoadingView />}
      </>
    );
  }

  // pages_images is stored in print order (Drupal fid order) — index = page.
  const pages = issue.pagesImages?.length ? issue.pagesImages : issue.coverImage ? [issue.coverImage] : [];
  if (pages.length === 0) {
    return (
      <>
        {header}
        <EmptyView message={t.magazine.noPages} />
      </>
    );
  }

  return (
    <>
      {header}
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <FlatList
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          initialNumToRender={2}
          windowSize={5}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            // iOS pinch-to-zoom per page; Android shows the page at fit size.
            <ScrollView
              style={{ width }}
              contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}>
              <Image
                source={item}
                style={{ width, height: height * 0.8 }}
                contentFit="contain"
                transition={100}
                accessibilityLabel={fill(t.magazine.page, { n: i + 1, total: pages.length })}
              />
            </ScrollView>
          )}
        />
        <View style={{ alignItems: 'center', paddingVertical: spacing.md, paddingBottom: spacing.xl }}>
          <AppText variant="caption" style={{ color: '#ddd', fontVariant: ['tabular-nums'] }}>
            {fill(t.magazine.page, { n: Math.min(index + 1, pages.length), total: pages.length })}
          </AppText>
        </View>
      </View>
    </>
  );
}
