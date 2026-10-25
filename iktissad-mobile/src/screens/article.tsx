import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import { ArticleBody, bodyAlign } from '@/components/article-body';
import { ErrorView, LoadingView } from '@/components/state-views';
import { api, ApiError, articleUrl, type Article } from '@/lib/api';
import { parseContent, plainText } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { brand, colors, MaxContentWidth, spacing } from '@/theme';
import { t } from '@/lib/strings';

export function ArticleScreen({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.article(slug),
    staleTime: 15 * 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const shareButton = query.data ? (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.share}
            hitSlop={10}
            onPress={() => Share.share({ message: `${query.data!.title}\n${articleUrl(query.data!.slug)}`, url: articleUrl(query.data!.slug) })}>
            <SymbolView
              name="square.and.arrow.up"
              size={20}
              tintColor={brand.navy}
              fallback={<AppText variant="label" style={{ color: brand.navy }}>{t.common.share}</AppText>}
            />
          </Pressable>
        ),
      }}
    />
  ) : null;

  if (query.data === undefined) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return <ErrorView message={t.article.notFound} onRetry={() => query.refetch()} />;
    }
    return query.isError ? <ErrorView onRetry={() => query.refetch()} /> : <LoadingView />;
  }

  return (
    <>
      {shareButton}
      <ArticleContent article={query.data} />
    </>
  );
}

function ArticleContent({ article }: { article: Article }) {
  const { width } = useWindowDimensions();
  const pad = width > MaxContentWidth ? (width - MaxContentWidth) / 2 : spacing.md;

  let blocks = parseContent(article.content);
  const excerpt = plainText(article.excerpt);
  // Profiles and some migrated items have no body: the summary becomes the body.
  const bodyIsExcerpt = blocks.length === 0 && !!excerpt;
  if (bodyIsExcerpt) blocks = [{ kind: 'paragraph', runs: [{ text: excerpt }] }];

  const align = bodyAlign;
  const title = plainText(article.title);
  const deck = bodyIsExcerpt ? '' : plainText(article.deck) || excerpt;
  const byline = [article.author?.name ? `${t.common.by} ${article.author.name}` : '', formatDate(article.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      {article.featuredImage ? (
        <View>
          <Image
            source={article.featuredImage}
            style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.secondaryBackground }}
            contentFit="cover"
            transition={150}
          />
          {article.featuredImageCaption || article.featuredImageCredit ? (
            <AppText variant="caption" muted style={{ paddingHorizontal: pad, paddingTop: spacing.xs }}>
              {[article.featuredImageCaption, article.featuredImageCredit].filter(Boolean).join(' — ')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: pad, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }}>
        {article.section ? (
          <AppText variant="label" style={[align, { color: brand.goldDark }]}>
            {article.section}
          </AppText>
        ) : null}
        <AppText variant="headline" selectable accessibilityRole="header" style={align}>
          {title}
        </AppText>
        {deck ? (
          <AppText variant="subhead" muted selectable style={[align, { fontSize: 18, lineHeight: 30 }]}>
            {deck}
          </AppText>
        ) : null}
        {byline ? (
          <AppText variant="caption" muted style={align}>
            {byline}
          </AppText>
        ) : null}
        <View style={{ height: 0.5, backgroundColor: colors.separator, marginTop: spacing.sm }} />
      </View>

      <ArticleBody blocks={blocks} />
    </ScrollView>
  );
}
