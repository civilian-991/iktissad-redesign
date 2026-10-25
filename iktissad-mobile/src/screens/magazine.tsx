import { Image } from "expo-image";
import { Link } from "expo-router";
import { Stack } from "expo-router/stack";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";

import { AppText } from "@/components/app-text";
import {
  EmptyView,
  ErrorView,
  FooterSpinner,
  InlineError,
  LoadingView,
} from "@/components/state-views";
import { usePaged } from "@/hooks/use-paged";
import { api, type MagazineIssue } from "@/lib/api";
import { formatMonthYear } from "@/lib/format";
import { fill, t } from "@/lib/strings";
import { brand, colors, spacing } from "@/theme";

export function MagazineScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : 2;
  const itemWidth = (width - spacing.md * (columns + 1)) / columns;
  const issues = usePaged(["issues"], (page) => api.issues(page));

  const header = <Stack.Screen options={{ title: t.magazine.title }} />;
  if (issues.data === undefined) {
    return (
      <>
        {header}
        {issues.isError ? (
          <ErrorView onRetry={() => issues.refetch()} />
        ) : (
          <LoadingView />
        )}
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        key={columns}
        data={issues.items}
        numColumns={columns}
        keyExtractor={(i) => i.id}
        contentInsetAdjustmentBehavior="automatic"
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.lg, paddingTop: spacing.sm }}
        onEndReached={issues.loadMore}
        onEndReachedThreshold={0.8}
        refreshControl={
          <RefreshControl
            refreshing={issues.isRefetching}
            onRefresh={() => void issues.refetch()}
            tintColor={brand.navy}
          />
        }
        ListHeaderComponent={
          issues.isRefetchError ? (
            <InlineError onRetry={() => issues.refetch()} />
          ) : undefined
        }
        ListEmptyComponent={<EmptyView message={t.common.empty} />}
        ListFooterComponent={
          issues.isFetchNextPageError ? (
            <InlineError onRetry={issues.loadMore} />
          ) : (
            <FooterSpinner visible={issues.isFetchingNextPage} />
          )
        }
        renderItem={({ item }) => <IssueCover issue={item} width={itemWidth} />}
      />
    </>
  );
}

function IssueCover({ issue, width }: { issue: MagazineIssue; width: number }) {
  return (
    <Link href={{ pathname: "/issue/[id]", params: { id: issue.id } }} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={{ width, gap: spacing.xs, opacity: pressed ? 0.75 : 1 }}>
            <Image
              source={issue.coverImage ?? undefined}
              style={{
                width,
                aspectRatio: 800 / 1054,
                borderRadius: 4,
                backgroundColor: colors.secondaryBackground,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
              contentFit="cover"
              transition={150}
              accessibilityLabel={issue.title}
            />
            {issue.issueNumber ? (
              <AppText variant="label">
                {fill(t.magazine.issue, { n: issue.issueNumber })}
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              {formatMonthYear(issue.publishDate)}
            </AppText>
          </View>
        )}
      </Pressable>
    </Link>
  );
}
