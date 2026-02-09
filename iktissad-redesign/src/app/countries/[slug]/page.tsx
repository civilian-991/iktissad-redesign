import type { Metadata } from 'next';
import CountryPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | الإقتصاد والأعمال`,
    description: `أخبار وتحليلات اقتصادية عن ${slug} من مجلة الإقتصاد والأعمال`,
  };
}

export default function CountryPage() {
  return <CountryPageClient />;
}
