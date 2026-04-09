import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import DossierPageClient from './PageClient';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('article_series')
    .select('title, description')
    .eq('slug', slug)
    .single();

  if (!data) return { title: 'ملف | الإقتصاد والأعمال' };

  return {
    title: `${data.title} | الإقتصاد والأعمال`,
    description: data.description || 'ملف تحريري من الإقتصاد والأعمال',
  };
}

export default async function DossierPage({ params }: Props) {
  const { slug } = await params;
  return <DossierPageClient slug={slug} />;
}
