import type { Metadata } from 'next';
import MagazinePageClient from './PageClient';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: 'المجلة | الإقتصاد والأعمال',
  description: 'تصفح أعداد مجلة الإقتصاد والأعمال الرقمية والمطبوعة',
};

export default function MagazinePage() {
  return <MagazinePageClient />;
}
