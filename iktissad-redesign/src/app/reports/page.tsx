import type { Metadata } from 'next';
import ReportsPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'الملفات | الإقتصاد والأعمال',
  description: 'ملفات تحريرية معمّقة حول الاقتصاد والأعمال والأسواق المالية',
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}
