import type { Metadata } from 'next';
import CountriesPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'الدول | الإقتصاد والأعمال',
  description: 'تغطية اقتصادية شاملة لجميع الدول العربية ومنطقة الشرق الأوسط',
};

export default function CountriesPage() {
  return <CountriesPageClient />;
}
