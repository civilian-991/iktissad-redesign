import type { Metadata } from 'next';
import AboutPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'من نحن | الإقتصاد والأعمال',
  description: 'تعرف على مجلة الإقتصاد والأعمال، المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي منذ عام 1956',
};

export default function AboutPage() {
  return <AboutPageClient />;
}
