/**
 * GraphQL Resolvers — IKTISSAD Public API
 *
 * All resolvers query Supabase using the admin client (service role)
 * since this is a public API protected by API key authentication.
 *
 * Errors are handled gracefully — resolvers return null or empty arrays,
 * never throw.
 */

import { createAdminClient } from '@/lib/supabase/admin';

// ── Internal types ────────────────────────────────────────────────────────────

interface SectionRow {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string | null;
}

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  status: string;
  published_at: string | null;
  featured_image: string | null;
  tags: string[];
  author_name: string | null;
  sections: SectionRow | null;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapSection(row: SectionRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en ?? null,
    description: row.description ?? null,
  };
}

function mapArticle(row: ArticleRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    content: row.content ?? null,
    status: row.status,
    publishedAt: row.published_at ?? null,
    featuredImage: row.featured_image ?? null,
    tags: row.tags ?? [],
    section: row.sections ? mapSection(row.sections) : null,
    authorName: row.author_name ?? null,
    readingTime: null,
    url: `/articles/${row.slug}`,
  };
}

// ── Resolver functions ────────────────────────────────────────────────────────

async function resolveArticles(
  _parent: unknown,
  args: { page?: number | null; limit?: number | null; section?: string | null; q?: string | null }
) {
  try {
    const { page = 1, limit = 20, section = null, q = null } = args;
    const admin = createAdminClient();
    const safePage = Math.max(1, page ?? 1);
    const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
    const offset = (safePage - 1) * safeLimit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from('articles')
      .select(
        'id, title, slug, excerpt, content, status, published_at, featured_image, tags, author_name, sections(id, slug, name, name_en, description)',
        { count: 'exact' }
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (section) query = query.eq('sections.slug', section);
    if (q) query = query.ilike('title', `%${q}%`);

    const { data, error, count } = await query;
    if (error || !data) {
      return { data: [], total: 0, page: safePage, limit: safeLimit, hasMore: false };
    }

    const total = count ?? 0;
    return {
      data: (data as ArticleRow[]).map(mapArticle),
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: offset + safeLimit < total,
    };
  } catch {
    return { data: [], total: 0, page: 1, limit: 20, hasMore: false };
  }
}

async function resolveArticle(_parent: unknown, args: { slug: string }) {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('articles')
      .select(
        'id, title, slug, excerpt, content, status, published_at, featured_image, tags, author_name, sections(id, slug, name, name_en, description)'
      )
      .eq('slug', args.slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return null;
    return mapArticle(data as ArticleRow);
  } catch {
    return null;
  }
}

async function resolveLatestArticles(
  _parent: unknown,
  args: { limit?: number | null; section?: string | null }
) {
  try {
    const admin = createAdminClient();
    const safeLimit = Math.min(50, Math.max(1, args.limit ?? 10));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from('articles')
      .select(
        'id, title, slug, excerpt, content, status, published_at, featured_image, tags, author_name, sections(id, slug, name, name_en, description)'
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(safeLimit);

    if (args.section) query = query.eq('sections.slug', args.section);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as ArticleRow[]).map(mapArticle);
  } catch {
    return [];
  }
}

async function resolveSections() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('sections')
      .select('id, slug, name, name_en, description')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return (data as SectionRow[]).map(mapSection);
  } catch {
    return [];
  }
}

async function resolveSectors() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('sectors')
      .select('id, slug, name, name_en, description, icon, color')
      .order('name', { ascending: true });

    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameEn: row.name_en ?? null,
      description: row.description ?? null,
      icon: row.icon ?? null,
      color: row.color ?? null,
    }));
  } catch {
    return [];
  }
}

async function resolveSeries() {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('article_series')
      .select('id, slug, title, title_en, description, series_articles(count)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row) => {
      const countArr = row.series_articles;
      let articleCount = 0;
      if (Array.isArray(countArr) && countArr.length > 0 && countArr[0].count !== undefined) {
        articleCount = parseInt(String(countArr[0].count), 10);
      }
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        titleEn: row.title_en ?? null,
        description: row.description ?? null,
        articleCount,
        articles: [],
      };
    });
  } catch {
    return [];
  }
}

async function resolveSeriesBySlug(_parent: unknown, args: { slug: string }) {
  try {
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: seriesRow, error: seriesError } = await (admin as any)
      .from('article_series')
      .select('id, slug, title, title_en, description')
      .eq('slug', args.slug)
      .eq('status', 'active')
      .single();

    if (seriesError || !seriesRow) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: seriesArticles, error: artError } = await (admin as any)
      .from('series_articles')
      .select('order_index, articles(id, title, slug, published_at)')
      .eq('series_id', seriesRow.id)
      .order('order_index', { ascending: true });

    if (artError) {
      return {
        id: seriesRow.id,
        slug: seriesRow.slug,
        title: seriesRow.title,
        titleEn: seriesRow.title_en ?? null,
        description: seriesRow.description ?? null,
        articleCount: 0,
        articles: [],
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedArticles = (seriesArticles ?? []).map((row: any) => {
      const art = row.articles ?? {};
      return {
        orderIndex: row.order_index ?? 0,
        title: art.title ?? '',
        slug: art.slug ?? '',
        publishedAt: art.published_at ?? null,
        url: `/articles/${art.slug ?? ''}`,
      };
    });

    return {
      id: seriesRow.id,
      slug: seriesRow.slug,
      title: seriesRow.title,
      titleEn: seriesRow.title_en ?? null,
      description: seriesRow.description ?? null,
      articleCount: mappedArticles.length,
      articles: mappedArticles,
    };
  } catch {
    return null;
  }
}

async function resolveSearchArticles(
  _parent: unknown,
  args: { query: string; limit?: number | null }
) {
  try {
    const admin = createAdminClient();
    const safeLimit = Math.min(50, Math.max(1, args.limit ?? 20));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('articles')
      .select(
        'id, title, slug, excerpt, content, status, published_at, featured_image, tags, author_name, sections(id, slug, name, name_en, description)'
      )
      .eq('status', 'published')
      .or(`title.ilike.%${args.query}%,excerpt.ilike.%${args.query}%`)
      .order('published_at', { ascending: false })
      .limit(safeLimit);

    if (error || !data) return [];
    return (data as ArticleRow[]).map(mapArticle);
  } catch {
    return [];
  }
}

// ── Resolver map (graphql-yoga createSchema format) ───────────────────────────

export const resolvers = {
  Query: {
    articles: resolveArticles,
    article: resolveArticle,
    latestArticles: resolveLatestArticles,
    sections: resolveSections,
    sectors: resolveSectors,
    series: resolveSeries,
    seriesBySlug: resolveSeriesBySlug,
    searchArticles: resolveSearchArticles,
  },
};
