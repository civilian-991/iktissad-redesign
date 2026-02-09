import type { Metadata } from 'next';
import TermsPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'شروط الاستخدام | الإقتصاد والأعمال',
  description: 'شروط وأحكام استخدام موقع مجلة الإقتصاد والأعمال',
};

export default function TermsPage() {
  return <TermsPageClient />;
}
