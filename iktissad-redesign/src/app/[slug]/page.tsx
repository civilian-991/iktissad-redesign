import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleForRender } from '@/lib/articles/get-article';
import ArticlePageClient from './PageClient';

// ISR: the article shell (content + JSON-LD) is statically rendered and cached,
// then revalidated hourly. No cookies/headers are read here, so the page renders
// to crawlable HTML. Per-user paywall/subscription state is resolved client-side
// via GET /api/articles/[slug]/access (see PageClient).
// The root layout reads headers() (CSP nonce), so every route renders
// dynamically — this page can't be statically prerendered. That's fine for SEO:
// because there is no `loading.tsx` boundary above this route, the dynamic render
// blocks and emits full HTML (article body + JSON-LD), rather than streaming a
// loading shell. Article data is served from Next's Data Cache (see
// getArticleForRender → unstable_cache) so the DB isn't hit on every request.
export const revalidate = 3600; // 1 hour (governs the cached article data)

const BASE_URL = 'https://www.iktissadonline.com';
const SITE_NAME = 'الإقتصاد والأعمال';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleForRender(slug);

  if (!article) {
    return {
      title: `الصفحة غير موجودة | ${SITE_NAME}`,
      description: 'اقرأ أحدث المقالات والتحليلات الاقتصادية في مجلة الإقتصاد والأعمال',
      robots: { index: false, follow: false },
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

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleForRender(slug);

  // Missing/unpublished article → real 404 (static not-found, proper status).
  if (!article) notFound();

  const newsArticleJsonLd = {
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
  };

  const breadcrumbJsonLd = {
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
              name: article.section,
              item: `${BASE_URL}/topics/${article.sectionSlug || article.section}`,
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
  };

  return (
    <>
      {/* Structured data — server-rendered into the static HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArticlePageClient slug={slug} initialArticle={article} />
    </>
  );
}
