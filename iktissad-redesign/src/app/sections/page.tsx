import type { Metadata } from 'next';
import SectionsPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'الأقسام | الإقتصاد والأعمال',
  description: 'تصفح أقسام مجلة الإقتصاد والأعمال: اقتصاد، أسواق، شركات، تكنولوجيا والمزيد',
};

export default function SectionsPage() {
  return <SectionsPageClient />;
}
