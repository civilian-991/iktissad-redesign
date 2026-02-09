import type { Metadata } from 'next';
import SectorPageClient from './PageClient';

const sectorNames: Record<string, string> = {
  'economy': 'اقتصاد عام',
  'finance': 'مال ومصارف',
  'energy': 'طاقة',
  'oil-gas': 'نفط وغاز',
  'tourism': 'سياحة وطيران',
  'technology': 'تكنولوجيا',
  'automotive': 'سيارات ومحركات',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = sectorNames[slug] || slug;
  return {
    title: `${name} | الإقتصاد والأعمال`,
    description: `تغطية شاملة لقطاع ${name} في العالم العربي`,
  };
}

export default function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  return <SectorPageClient params={params} />;
}
