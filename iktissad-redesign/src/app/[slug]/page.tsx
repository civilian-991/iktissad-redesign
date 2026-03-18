import type { Metadata } from 'next';
import ArticlePageClient from './PageClient';

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

  const url = `${BASE_URL}/${slug}`;
  const images = article.featuredImage
    ? [{ url: article.featuredImage, width: 1200, height: 630, alt: article.title }]
    : [];

  return {
    title: `${article.title} | ${SITE_NAME}`,
    description: article.excerpt || 'اقرأ أحدث المقالات والتحليلات الاقتصادية',
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description: article.excerpt || 'اقرأ أحدث المقالات والتحليلات الاقتصادية',
      siteName: SITE_NAME,
      locale: 'ar_AR',
      images,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author?.name ? [`${BASE_URL}/profiles/${article.author.name}`] : [],
      section: article.section?.name,
      tags: article.tags ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || 'اقرأ أحدث المقالات والتحليلات الاقتصادية',
      images: article.featuredImage ? [article.featuredImage] : [],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  const jsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt || '',
        image: article.featuredImage ? [article.featuredImage] : [],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: {
          '@type': 'Person',
          name: article.author?.name || SITE_NAME,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${BASE_URL}/${slug}`,
        },
        inLanguage: 'ar',
        isAccessibleForFree: true,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticlePageClient params={params} />
    </>
  );
}
