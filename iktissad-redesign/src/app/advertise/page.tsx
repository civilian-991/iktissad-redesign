import type { Metadata } from 'next';
import AdvertisePageClient from './PageClient';
import { getSiteSetting, type AdvertiseStats } from '@/lib/site-settings';

export const metadata: Metadata = {
  title: 'الإعلان | الإقتصاد والأعمال',
  description: 'فرص إعلانية مميزة في مجلة الإقتصاد والأعمال للوصول إلى صناع القرار',
};

export default async function AdvertisePage() {
  const advertiseStats = await getSiteSetting<AdvertiseStats>('advertise_stats');
  return <AdvertisePageClient advertiseStats={advertiseStats} />;
}
