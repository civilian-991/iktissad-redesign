import type { Metadata } from 'next';
import SuccessPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'تم الاشتراك بنجاح — اقتصاد',
  description: 'شكراً لاشتراكك في إقتصاد Premium. استمتع بوصول كامل لجميع المحتوى.',
  robots: { index: false, follow: false },
};

export default function SubscribeSuccessPage() {
  return <SuccessPageClient />;
}
