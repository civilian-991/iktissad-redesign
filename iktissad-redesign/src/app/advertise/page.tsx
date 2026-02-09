import type { Metadata } from 'next';
import AdvertisePageClient from './PageClient';

export const metadata: Metadata = {
  title: 'الإعلان | الإقتصاد والأعمال',
  description: 'فرص إعلانية مميزة في مجلة الإقتصاد والأعمال للوصول إلى صناع القرار',
};

export default function AdvertisePage() {
  return <AdvertisePageClient />;
}
