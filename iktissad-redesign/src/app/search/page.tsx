import type { Metadata } from 'next';
import SearchPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'بحث | الإقتصاد والأعمال',
  description: 'ابحث في أرشيف مجلة الإقتصاد والأعمال عن المقالات والتحليلات الاقتصادية',
};

export default function SearchPage() {
  return <SearchPageClient />;
}
