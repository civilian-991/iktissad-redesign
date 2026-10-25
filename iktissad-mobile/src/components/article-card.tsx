import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Share, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { articleUrl, type Article } from '@/lib/api';
import { plainText } from '@/lib/content';
import { formatRelative } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { t } from '@/lib/strings';

function useCardText(article: Article) {
  return {
    title: plainText(article.title),
    excerpt: plainText(article.excerpt),
    meta: [article.section, formatRelative(article.publishedAt)].filter(Boolean).join(' · '),
  };
}

function CardLink({ article, children }: { article: Article; children: React.ReactNode }) {
  return (
    <Link href={{ pathname: '/article/[slug]', params: { slug: article.slug } }} asChild>
      <Link.Trigger>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{children}</Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction
          title={t.common.share}
          icon="square.and.arrow.up"
          onPress={() => Share.share({ message: `${article.title}\n${articleUrl(article.slug)}` })}
        />
      </Link.Menu>
    </Link>
  );
}

/** Large lead story: full-width image, big headline, excerpt. */
export function LeadCard({ article }: { article: Article }) {
  const { title, excerpt, meta } = useCardText(article);
  return (
    <CardLink article={article}>
      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        {article.featuredImage ? (
          <Image
            source={article.featuredImage}
            style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.secondaryBackground }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
          <AppText variant="headline">{title}</AppText>
          {excerpt ? (
            <AppText variant="subhead" muted numberOfLines={3}>
              {excerpt}
            </AppText>
          ) : null}
          {meta ? <AppText variant="caption" muted>{meta}</AppText> : null}
        </View>
      </View>
    </CardLink>
  );
}

/** Standard list row: thumbnail at the trailing edge, headline and meta. */
export function ArticleRow({ article }: { article: Article }) {
  const { title, meta } = useCardText(article);
  return (
    <CardLink article={article}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="title" numberOfLines={3}>
            {title}
          </AppText>
          {meta ? <AppText variant="caption" muted>{meta}</AppText> : null}
        </View>
        {article.featuredImage ? (
          <Image
            source={article.featuredImage}
            style={{
              width: 96,
              height: 72,
              borderRadius: 8,
              borderCurve: 'continuous',
              backgroundColor: colors.secondaryBackground,
            }}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>
    </CardLink>
  );
}

/** Compact card for horizontal carousels. */
export function CompactCard({ article, width }: { article: Article; width: number }) {
  const { title } = useCardText(article);
  return (
    <CardLink article={article}>
      <View style={{ width, gap: spacing.sm }}>
        <Image
          source={article.featuredImage ?? undefined}
          style={{
            width,
            aspectRatio: 4 / 3,
            borderRadius: 10,
            borderCurve: 'continuous',
            backgroundColor: colors.secondaryBackground,
          }}
          contentFit="cover"
          transition={150}
        />
        <AppText variant="subhead" numberOfLines={3} style={{ fontSize: 15, lineHeight: 23 }}>
          {title}
        </AppText>
      </View>
    </CardLink>
  );
}
