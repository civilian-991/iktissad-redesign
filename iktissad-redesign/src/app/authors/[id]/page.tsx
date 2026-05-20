import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import AuthorDetailClient from './PageClient';

export const revalidate = 600; // 10 minutes

const SITE_NAME = 'الإقتصاد والأعمال';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = {
    title: `كاتب | ${SITE_NAME}`,
    description: 'صفحة الكاتب ومقالاته على موقع الإقتصاد والأعمال',
  };

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) return fallback;

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin.from('users') as any)
      .select('name, avatar, status')
      .eq('id', id)
      .single();

    if (!row || (row.status && row.status !== 'active')) return fallback;

    const images = row.avatar
      ? [{ url: row.avatar as string }]
      : undefined;

    return {
      title: `${row.name} | ${SITE_NAME}`,
      description: `جميع المقالات والتحليلات بقلم ${row.name} على موقع الإقتصاد والأعمال`,
      openGraph: {
        title: `${row.name} | ${SITE_NAME}`,
        description: `جميع المقالات والتحليلات بقلم ${row.name}`,
        images,
        type: 'profile',
      },
      twitter: {
        card: 'summary',
        title: `${row.name} | ${SITE_NAME}`,
        description: `جميع المقالات والتحليلات بقلم ${row.name}`,
        images: row.avatar ? [row.avatar as string] : undefined,
      },
    };
  } catch {
    return fallback;
  }
}

export default function AuthorDetailPage() {
  return <AuthorDetailClient />;
}
