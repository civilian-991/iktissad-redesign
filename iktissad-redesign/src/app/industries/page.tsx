import type { Metadata } from 'next';
import SectorsPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'القطاعات | الإقتصاد والأعمال',
  description: 'تغطية شاملة لجميع القطاعات الاقتصادية في العالم العربي',
};

export default function SectorsPage() {
  return <SectorsPageClient />;
}
