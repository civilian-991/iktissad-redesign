import type { Metadata } from 'next';
import LatestArticlesPageClient from './PageClient';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: 'آخر الأخبار | الإقتصاد والأعمال',
  description: 'تصفح أحدث المقالات والتحليلات الاقتصادية والمالية في مجلة الإقتصاد والأعمال',
};

export default function LatestArticlesPage() {
  return <LatestArticlesPageClient />;
}
