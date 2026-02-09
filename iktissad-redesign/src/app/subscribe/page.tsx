import type { Metadata } from 'next';
import SubscribePageClient from './PageClient';

export const metadata: Metadata = {
  title: 'اشتراك | الإقتصاد والأعمال',
  description: 'اشترك في مجلة الإقتصاد والأعمال واحصل على أحدث التحليلات والأخبار الاقتصادية',
};

export default function SubscribePage() {
  return <SubscribePageClient />;
}
