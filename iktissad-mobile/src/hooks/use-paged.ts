import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

import type { Page } from '@/lib/api';

/** Infinite list over the site's page/totalPages pagination, de-duplicated by id. */
export function usePaged<P extends Page<{ id: string }>>(
  key: QueryKey,
  fetchPage: (page: number) => Promise<P>,
  enabled = true,
) {
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1 as number,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled,
  });

  const seen = new Set<string>();
  const items: P['items'][number][] = [];
  for (const p of query.data?.pages ?? []) {
    for (const item of p.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  return { ...query, items, loadMore };
}
