import type { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ArticlePageClient from './PageClient';

export const revalidate = 3600; // 1 hour

const BASE_URL = 'https://www.iktissadonline.com';
const SITE_NAME = 'الإقتصاد والأعمال';

async function getArticle(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/articles/${slug}`, {
      cache: 'force-cache',
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: `مقال | ${SITE_NAME}`,
      description: 'اقرأ أحدث المقالات والتحليلات الاقتصادية في مجلة الإقتصاد والأعمال',
    };
  }

  // Dedicated SEO fields take priority; fall back to article content
  const metaTitle = article.metaTitle || article.title;
  const metaDescription = article.metaDescription || article.excerpt || 'اقرأ أحدث المقالات والتحليلات الاقتصادية';
  const ogImageUrl = article.ogImage || article.featuredImage;
  const canonicalUrl = article.canonicalUrl || `${BASE_URL}/${slug}`;

  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: metaTitle }]
    : [];

  return {
    title: `${metaTitle} | ${SITE_NAME}`,
    description: metaDescription,
    ...(article.noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: metaTitle,
      description: metaDescription,
      siteName: SITE_NAME,
      locale: 'ar_AR',
      images: ogImages,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author?.id ? [`${BASE_URL}/authors/${encodeURIComponent(article.author.slug ?? article.author.id)}`] : [],
      section: article.section,
      tags: article.tags ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "ar": canonicalUrl,
        "en": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
  };
}


/** Reads the paywall key from site_settings. Falls back to safe defaults. */
async function getPaywallSettings(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await (supabase as any)
    .from('site_settings')
    .select('value')
    .eq('key', 'paywall')
    .single();
  const v = data?.value ?? {};
  return {
    freeArticleLimit:           (v.freeArticleLimit           as number)  ?? 5,
    giftLinksPerMonth:          (v.giftLinksPerMonth          as number)  ?? 5,
    singleArticleDefaultPrice:  (v.singleArticleDefaultPrice  as number)  ?? 5,
    dynamicPaywall:             (v.dynamicPaywall             as boolean) ?? false,
    socialBonusArticle:         (v.socialBonusArticle         as boolean) ?? true,
    highEngagementBonus:        (v.highEngagementBonus        as number)  ?? 2,
    highEngagementThreshold:    (v.highEngagementThreshold    as number)  ?? 70,
  };
}

/**
 * Resolves subscription tier, monthly read count, paywall settings, and
 * article purchase status, then renders ArticlePageClient with those props.
 * Runs as a separate async Server Component so it can be Suspense-wrapped.
 */
async function ArticleWithSubscription({
  params,
  giftToken,
}: {
  params: Promise<{ slug: string }>;
  giftToken?: string;
}) {
  const supabase = await createClient();
  const { slug } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  let subscriptionTier: 'free' | 'premium' | 'digital' = 'free';
  let freeArticlesReadThisMonth = 0;
  let hasPurchasedArticle = false;
  let giftValid = false;
  let dbUserId: string | null = null;

  // Resolve paywall settings + user data in parallel
  const [paywallSettings] = await Promise.all([
    getPaywallSettings(supabase),
  ]);

  if (user) {
    // users.id = auth.uid() in Supabase Auth — no secondary lookup needed
    dbUserId = user.id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (dbUserId) {
      // Fetch article for purchase check (need article id from slug)
      const { data: articleRow } = await (supabase as any)
        .from('articles')
        .select('id')
        .eq('slug', slug)
        .single();

      const queries: Promise<any>[] = [
        // subscription tier
        (supabase as any)
          .from('subscribers')
          .select('status, subscription_plans!plan_id(tier)')
          .eq('user_id', dbUserId)
          .eq('status', 'active')
          .single(),
        // monthly read count
        (supabase as any)
          .from('reading_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', dbUserId)
          .gte('created_at', startOfMonth.toISOString()),
      ];

      if (articleRow?.id) {
        queries.push(
          // article purchase
          (supabase as any)
            .from('article_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', dbUserId)
            .eq('article_id', articleRow.id)
        );
      }

      const results = await Promise.all(queries);
      const [subResult, countResult, purchaseResult] = results;

      if (subResult?.data) {
        subscriptionTier =
          (subResult.data.subscription_plans as any)?.tier ?? 'free';
      }
      freeArticlesReadThisMonth = countResult?.count ?? 0;
      hasPurchasedArticle = (purchaseResult?.count ?? 0) > 0;
    }
  }

  // ── 4.5 Dynamic Paywall Intelligence ─────────────────────────────────────
  // Adjusts freeArticleLimit upward for high-engagement or social-referral users.
  // Only activates when dynamicPaywall=true in site_settings.
  let effectiveFreeLimit = paywallSettings.freeArticleLimit;

  if (paywallSettings.dynamicPaywall && subscriptionTier === 'free') {
    // Detect social media referral from the incoming Referer header
    if (paywallSettings.socialBonusArticle) {
      const hdrs = await headers();
      const referer = hdrs.get('referer') ?? '';
      const isSocialReferral = /facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|t\.me|whatsapp/i.test(referer);
      if (isSocialReferral) {
        effectiveFreeLimit += 1;
      }
    }

    // Compute engagement score from past 3 months of reading_sessions for logged-in users
    if (dbUserId) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: sessions } = await (supabase as any)
        .from('reading_sessions')
        .select('scroll_depth, read_through')
        .eq('user_id', dbUserId)
        .gte('created_at', threeMonthsAgo.toISOString())
        .limit(50);

      if (sessions && sessions.length >= 3) {
        const avgScrollDepth = sessions.reduce(
          (sum: number, s: any) => sum + (s.scroll_depth ?? 0), 0
        ) / sessions.length;

        if (avgScrollDepth >= paywallSettings.highEngagementThreshold) {
          effectiveFreeLimit += paywallSettings.highEngagementBonus;
        }
      }
    }
  }

  // Validate gift token server-side if present
  if (giftToken) {
    const admin = (await import('@/lib/supabase/admin')).createAdminClient();
    const { data: giftRow } = await (admin as any)
      .from('gift_links')
      .select('id, uses_count, max_uses, expires_at')
      .eq('token', giftToken)
      .single();

    if (
      giftRow &&
      giftRow.uses_count < giftRow.max_uses &&
      new Date(giftRow.expires_at) > new Date()
    ) {
      giftValid = true;
    }
  }

  return (
    <ArticlePageClient
      params={params}
      subscriptionTier={subscriptionTier}
      freeArticlesReadThisMonth={freeArticlesReadThisMonth}
      freeArticleLimit={effectiveFreeLimit}
      hasPurchasedArticle={hasPurchasedArticle}
      giftValid={giftValid}
      giftToken={giftToken}
      paywallSettings={paywallSettings}
      dbUserId={dbUserId}
    />
  );
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const giftToken = typeof sp?.gift === 'string' ? sp.gift : undefined;
  const article = await getArticle(slug);

  const newsArticleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.metaTitle || article.title,
        description: article.metaDescription || article.excerpt || '',
        image: (article.ogImage || article.featuredImage)
          ? [{ '@type': 'ImageObject', url: article.ogImage || article.featuredImage, width: 1200, height: 630 }]
          : [],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: article.author?.name
          ? {
              '@type': 'Person',
              name: article.author.name,
              url: `${BASE_URL}/authors/${encodeURIComponent(article.author.slug ?? article.author.id ?? article.author.name)}`,
            }
          : { '@type': 'Organization', name: SITE_NAME, url: BASE_URL },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/logo.png`,
            width: 200,
            height: 60,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': article.canonicalUrl || `${BASE_URL}/${slug}`,
        },
        articleSection: article.section || undefined,
        keywords: article.tags?.join(', ') || undefined,
        inLanguage: 'ar',
        isAccessibleForFree: !article.paywalled,
      }
    : null;

  const breadcrumbJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: BASE_URL,
          },
          ...(article.section
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: article.section?.name ?? article.section,
                  item: `${BASE_URL}/sections/${article.section?.slug ?? article.section}`,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: article.title,
                },
              ]
            : [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: article.title,
                },
              ]),
        ],
      }
    : null;

  return (
    <>
      {/* Structured data renders immediately — not gated behind Suspense */}
      {newsArticleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {/*
        Suspense boundary: ArticlePageClient renders immediately via fallback
        (free tier defaults). The real subscription state streams in from
        ArticleWithSubscription once the DB queries resolve. Since the article
        content itself loads client-side via SWR, there is no visible flash.
      */}
      <Suspense fallback={<ArticlePageClient params={params} />}>
        <ArticleWithSubscription params={params} giftToken={giftToken} />
      </Suspense>
    </>
  );
}
