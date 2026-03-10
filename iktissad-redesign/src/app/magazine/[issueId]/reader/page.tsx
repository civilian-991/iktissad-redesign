import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ReaderClient from './ReaderClient';
import type { MagazineIssue, MagazineSpread, MagazineSection } from '@/types';

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
        title: `${data.title} — قارئ المجلة | الإقتصاد والأعمال`,
        description: data.subtitle || 'اقرأ المجلة الآن',
        robots: { index: false, follow: false },
        openGraph: {
          images: data.cover_image ? [{ url: data.cover_image }] : [],
        },
      };
    }
  } catch {
    // fallback metadata
  }

  return {
    title: 'قارئ المجلة | الإقتصاد والأعمال',
    robots: { index: false, follow: false },
  };
}

export default async function ReaderPage({ params }: PageProps) {
  const { issueId } = await params;
  const supabase = await createClient();

  // ── Authentication check ────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/magazine/${issueId}/reader`);
  }

  // ── Subscription check ──────────────────────────────────────────────────
  // Query subscribers table for active or trialing status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriber } = await (supabase as any)
    .from('subscribers')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (!subscriber) {
    redirect(`/subscribe?redirect=/magazine/${issueId}/reader`);
  }

  // ── Fetch magazine issue ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issueRowRaw, error: issueError } = await (supabase as any)
    .from('magazine_issues')
    .select('*')
    .eq('id', issueId)
    .single();

  if (issueError || !issueRowRaw) {
    redirect('/magazine');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issueRow = issueRowRaw as any;

  const issue: MagazineIssue = {
    id: issueRow.id,
    issueNumber: issueRow.issue_number,
    title: issueRow.title,
    titleEn: issueRow.title_en ?? '',
    subtitle: issueRow.subtitle ?? '',
    coverImage: issueRow.cover_image ?? '',
    publishDate: issueRow.publish_date,
    articles: [],
    pdfUrl: issueRow.pdf_url ?? '',
    pages: issueRow.pages ?? 0,
    views: issueRow.views ?? 0,
    downloads: issueRow.downloads ?? 0,
    featured: issueRow.featured ?? false,
    status: issueRow.status,
    highlights: (issueRow.highlights as string[]) ?? [],
    createdAt: issueRow.created_at ?? '',
    updatedAt: issueRow.updated_at ?? '',
  };

  // ── Fetch spreads ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spreadRows } = await (supabase as any)
    .from('magazine_spreads')
    .select('*')
    .eq('issue_id', issueId)
    .order('page_number', { ascending: true });

  const spreads: MagazineSpread[] = (spreadRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    issueId: r.issue_id as string,
    sectionId: r.section_id as string | null,
    pageNumber: r.page_number as number,
    templateId: r.template_id as string,
    zones: (r.zones as Record<string, unknown>) ?? {},
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    updatedAt: r.updated_at as string,
    updatedBy: r.updated_by as string | null,
  }));

  // ── Fetch magazine sections ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectionRows } = await (supabase as any)
    .from('magazine_sections')
    .select('*')
    .eq('issue_id', issueId)
    .order('sort_order', { ascending: true });

  const sections: MagazineSection[] = (sectionRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    issueId: r.issue_id as string,
    slug: r.slug as string,
    name: r.name as string,
    nameEn: (r.name_en as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
    themeColor: (r.theme_color as string) ?? '#DDA853',
    coverImage: (r.cover_image as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
  }));

  return (
    <ReaderClient
      issue={issue}
      spreads={spreads}
      sections={sections}
    />
  );
}
