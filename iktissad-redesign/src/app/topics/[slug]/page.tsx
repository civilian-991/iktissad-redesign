import type { Metadata } from 'next';
import SectionPageClient from './PageClient';

export const revalidate = 3600; // 1 hour

const sectionNames: Record<string, string> = {
  'economy': 'اقتصاد',
  'companies': 'شركات',
  'markets': 'أسواق',
  'technology': 'تكنولوجيا',
  'energy-innovation': 'طاقة وابتكار',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = sectionNames[slug] || slug;
  return {
    title: `${name} | الإقتصاد والأعمال`,
    description: `آخر الأخبار والتحليلات في قسم ${name} من مجلة الإقتصاد والأعمال`,
  };
}

export default function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <SectionPageClient params={params} />;
}
