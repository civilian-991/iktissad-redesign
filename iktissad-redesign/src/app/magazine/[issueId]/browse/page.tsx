import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MagazineBrowsePageClient from './PageClient';
import type { MagazineIssue } from '@/types';

export const revalidate = 3600; // 1 hour

interface PageProps {
  params: Promise<{ issueId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { issueId } = await params;
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('magazine_issues')
      .select('title, subtitle, cover_image')
      .eq('id', issueId)
      .single();
    if (data) {
      return {
        title: `${data.title} | الإقتصاد والأعمال`,
        description: data.subtitle || `تصفح العدد ${issueId}`,
        robots: { index: false, follow: false },
        openGraph: {
          images: data.cover_image ? [{ url: data.cover_image }] : [],
        },
      };
    }
  } catch {
    // fallback
  }
  return {
    title: 'تصفح المجلة | الإقتصاد والأعمال',
    robots: { index: false, follow: false },
  };
}

export default async function MagazineBrowsePage({ params }: PageProps) {
  const { issueId } = await params;
  const supabase = await createClient();

  // ── Auth check ─────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // ── Subscription check ─────────────────────────────────────────────────────
  let isSubscriber = false;
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
      .from('subscribers')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();
    isSubscriber = !!sub;
  }

  // ── Fetch issue ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issueRowRaw, error } = await (supabase as any)
    .from('magazine_issues')
    .select('*')
    .eq('id', issueId)
    .single();

  if (error || !issueRowRaw) {
    redirect('/magazine');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = issueRowRaw as any;
  const issue: MagazineIssue = {
    id: r.id,
    issueNumber: r.issue_number,
    title: r.title,
    titleEn: r.title_en ?? '',
    subtitle: r.subtitle ?? '',
    coverImage: r.cover_image ?? '',
    publishDate: r.publish_date,
    articles: [],
    pdfUrl: r.pdf_url ?? '',
    pages: r.pages ?? 0,
    views: r.views ?? 0,
    downloads: r.downloads ?? 0,
    featured: r.featured ?? false,
    status: r.status,
    highlights: (r.highlights as string[]) ?? [],
    pagesImages: (r.pages_images as string[]) ?? [],
    pagesReady: r.pages_ready ?? false,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
  };

  return (
    <MagazineBrowsePageClient
      issue={issue}
      isSubscriber={isSubscriber}
      isLoggedIn={isLoggedIn}
    />
  );
}
