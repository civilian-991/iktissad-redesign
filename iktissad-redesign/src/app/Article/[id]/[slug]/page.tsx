/**
 * Awalan legacy URL redirect: /Article/[id]/[slug] → /[new-slug]
 * Preserves inbound links from awalan.com
 */
import { redirect, notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export default async function AwalanArticlePage({ params }: Props) {
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) notFound();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('source_site', 'awalan')
    .eq('source_id', articleId)
    .maybeSingle();

  if (!data?.slug) notFound();

  redirect(`/${data.slug}`);
}
