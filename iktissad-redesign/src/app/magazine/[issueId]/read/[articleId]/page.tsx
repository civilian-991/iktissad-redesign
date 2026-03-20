import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Article, MagazineIssue, MagazineSpread } from '@/types';
import ArticleReadingPageClient from './PageClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ issueId: string; articleId: string }>;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { issueId, articleId } = await params;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('articles')
      .select('title, excerpt, featured_image')
      .eq('id', articleId)
      .single();

    const { data: issueData } = await supabase
      .from('magazine_issues')
      .select('title, issue_number')
      .eq('id', issueId)
      .single();

    if (data) {
      return {
        title: `${data.title} — ${issueData?.title ?? 'الإقتصاد والأعمال'}`,
        description: data.excerpt ?? undefined,
        // noindex for subscriber-only content
        robots: { index: false, follow: false },
        openGraph: {
          title: data.title,
          description: data.excerpt ?? undefined,
          images: data.featured_image ? [{ url: data.featured_image }] : [],
          type: 'article',
        },
      };
    }
  } catch {
    // fallback below
  }

  return {
    title: 'مقال | الإقتصاد والأعمال',
    robots: { index: false, follow: false },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArticleReadPage({ params }: PageProps) {
  const { issueId, articleId } = await params;
  const supabase = await createClient();

  // ── Auth check ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/magazine/${issueId}/read/${articleId}`);
  }

  // ── Subscription check ────────────────────────────────────────────────────
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (!subscriber) {
    redirect(`/subscribe?redirect=/magazine/${issueId}/read/${articleId}`);
  }

  // ── Fetch article ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articleRow, error: articleError } = await (supabase as any)
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (articleError || !articleRow) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = articleRow as Record<string, any>;

  const article: Article = {
    id: row.id,
    title: row.title,
    titleEn: row.title_en ?? '',
    slug: row.slug,
    excerpt: row.excerpt ?? '',
    excerptEn: row.excerpt_en ?? '',
    content: row.content ?? '',
    contentEn: row.content_en ?? '',
    body: row.body ?? [],
    deck: row.deck ?? undefined,
    deckEn: row.deck_en ?? undefined,
    accentColor: row.accent_color ?? undefined,
    featuredImage: row.featured_image ?? '',
    section: row.section_id ?? '',
    sector: row.sector_id ?? '',
    country: row.country_id ?? '',
    author: {
      name: row.author_name ?? '',
      avatar: row.author_avatar ?? '',
    },
    tags: (row.tags as string[]) ?? [],
    status: row.status ?? 'published',
    featured: row.featured ?? false,
    editorChoice: row.editor_choice ?? false,
    paywalled: row.is_paywalled ?? false,
    isBreaking: row.is_breaking ?? false,
    views: row.views ?? 0,
    publishedAt: row.published_at ?? row.created_at ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };

  // ── Fetch magazine issue ──────────────────────────────────────────────────
  const { data: issueRow } = await supabase
    .from('magazine_issues')
    .select('id, title, issue_number, cover_image, publish_date')
    .eq('id', issueId)
    .single();

  const issue: Pick<MagazineIssue, 'id' | 'title' | 'issueNumber' | 'coverImage' | 'publishDate'> | null =
    issueRow
      ? {
          id: issueRow.id,
          title: issueRow.title,
          issueNumber: issueRow.issue_number,
          coverImage: issueRow.cover_image ?? '',
          publishDate: issueRow.publish_date,
        }
      : null;

  // ── Fetch related articles (same section, same issue) ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spreadRows } = await (supabase as any)
    .from('magazine_spreads')
    .select('zones')
    .eq('issue_id', issueId)
    .neq('zones->article->id', articleId)
    .limit(3);

  // Extract article references from spreads for related articles
  const relatedArticleIds: string[] = [];
  if (spreadRows) {
    for (const row of spreadRows as MagazineSpread[]) {
      const zones = row.zones as { article?: { id?: string } };
      if (zones?.article?.id) {
        relatedArticleIds.push(zones.article.id);
      }
    }
  }

  const relatedArticles: Article[] = [];
  if (relatedArticleIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: relatedRows } = await (supabase as any)
      .from('articles')
      .select('id, title, excerpt, featured_image, published_at')
      .in('id', relatedArticleIds.slice(0, 3));

    if (relatedRows) {
      for (const r of relatedRows as Record<string, unknown>[]) {
        relatedArticles.push({
          id: r.id as string,
          title: r.title as string,
          titleEn: '',
          slug: r.id as string,
          excerpt: (r.excerpt as string) ?? '',
          excerptEn: '',
          content: '',
          contentEn: '',
          featuredImage: (r.featured_image as string) ?? '',
          section: '',
          sector: '',
          country: '',
          author: { name: '', avatar: '' },
          tags: [],
          status: 'published',
          featured: false,
          editorChoice: false,
          paywalled: false,
          isBreaking: false,
          views: 0,
          publishedAt: (r.published_at as string) ?? '',
          createdAt: (r.published_at as string) ?? '',
          updatedAt: (r.published_at as string) ?? '',
        });
      }
    }
  }

  return (
    <ArticleReadingPageClient
      article={article}
      issue={issue}
      issueId={issueId}
      relatedArticles={relatedArticles}
    />
  );
}
