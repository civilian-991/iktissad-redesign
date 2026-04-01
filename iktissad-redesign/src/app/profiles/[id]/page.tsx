import type { Metadata } from 'next';
import ProfileDetailPageClient from './PageClient';

export const revalidate = 3600; // 1 hour

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `شخصية ${id} | الإقتصاد والأعمال`,
    description: 'تعرف على أبرز الشخصيات الاقتصادية في العالم العربي',
  };
}

export default function ProfileDetailPage() {
  return <ProfileDetailPageClient />;
}
