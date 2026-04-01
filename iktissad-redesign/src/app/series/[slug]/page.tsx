import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SeriesPageClient from './PageClient';

export const revalidate = 3600; // 1 hour

async function fetchSeriesMeta(slug: string) {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('article_series')
      .select('title, description')
      .eq('slug', slug)
      .single();
    return data as { title: string; description?: string } | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await fetchSeriesMeta(slug);
  return {
    title: meta?.title
      ? `${meta.title} — الإقتصاد والأعمال`
      : 'سلسلة مقالات — الإقتصاد والأعمال',
    description: meta?.description ?? 'سلسلة مقالات متخصصة من مجلة الإقتصاد والأعمال',
  };
}

export default function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  return <SeriesPageClient params={params} />;
}
