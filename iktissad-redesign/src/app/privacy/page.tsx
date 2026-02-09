import type { Metadata } from 'next';
import PrivacyPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | الإقتصاد والأعمال',
  description: 'سياسة الخصوصية وحماية البيانات في موقع مجلة الإقتصاد والأعمال',
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
