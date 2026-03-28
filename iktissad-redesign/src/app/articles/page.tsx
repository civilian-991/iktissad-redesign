import type { Metadata } from 'next';
import LatestArticlesPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'احدث المقالات | الإقتصاد والأعمال',
  description: 'تصفح أحدث المقالات والتحليلات الاقتصادية والمالية في مجلة الإقتصاد والأعمال',
};

export default function LatestArticlesPage() {
  return <LatestArticlesPageClient />;
}
