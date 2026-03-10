import type { Metadata } from 'next';
import ArticlePageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/articles/${id}`, { next: { revalidate: 60 } });
    const json = await res.json();
    if (json.data) {
      return {
        title: `${json.data.title} | الإقتصاد والأعمال`,
        description: json.data.excerpt || 'اقرأ أحدث المقالات والتحليلات الاقتصادية',
      };
    }
  } catch {}
  return {
    title: 'مقال | الإقتصاد والأعمال',
    description: 'اقرأ أحدث المقالات والتحليلات الاقتصادية في مجلة الإقتصاد والأعمال',
  };
}

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return <ArticlePageClient params={params} />;
}
