import type { Metadata } from 'next';
import ProfilesPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'شخصيات | الإقتصاد والأعمال',
  description: 'تعرف على أبرز الشخصيات الاقتصادية والمالية في العالم العربي',
};

export default function ProfilesPage() {
  return <ProfilesPageClient />;
}
