import type { Metadata } from 'next';
import ArticlePageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // In production, fetch article data for dynamic title
  return {
    title: `مقال ${id} | الإقتصاد والأعمال`,
    description: 'اقرأ أحدث المقالات والتحليلات الاقتصادية في مجلة الإقتصاد والأعمال',
  };
}

export default function ArticlePage() {
  return <ArticlePageClient />;
}
