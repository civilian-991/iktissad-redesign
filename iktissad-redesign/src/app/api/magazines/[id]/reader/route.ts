import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapMagazineIssueRow } from '@/lib/supabase/mappers';
import type { ApiResponse, MagazineIssue, MagazineSpread, MagazineSection } from '@/types';

interface ReaderData {
  issue: MagazineIssue;
  spreads: MagazineSpread[];
  sections: MagazineSection[];
  articles: unknown[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Fetch issue ─────────────────────────────────────────────────────────
  const { data: issueRow, error: issueError } = await supabase
    .from('magazine_issues')
    .select('*')
    .eq('id', id)
    .single();

  if (issueError || !issueRow) {
    return NextResponse.json(
      { error: issueError?.message ?? 'Issue not found' } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issue = mapMagazineIssueRow(issueRow as any);

  // ── Fetch spreads ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spreadRows, error: spreadError } = await (supabase as any)
    .from('magazine_spreads')
    .select('*')
    .eq('issue_id', id)
    .order('page_number', { ascending: true });

  if (spreadError) {
    // Table may not exist yet — return empty array gracefully
    console.warn('[reader] magazine_spreads query failed:', spreadError.message);
  }

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

  // ── Fetch sections ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectionRows, error: sectionError } = await (supabase as any)
    .from('magazine_sections')
    .select('*')
    .eq('issue_id', id)
    .order('sort_order', { ascending: true });

  if (sectionError) {
    console.warn('[reader] magazine_sections query failed:', sectionError.message);
  }

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

  // ── Fetch articles linked to this issue ─────────────────────────────────
  const { data: articleRows } = await supabase
    .from('magazine_articles')
    .select('articles(*)')
    .eq('issue_id', id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (articleRows ?? []).map((r: any) => r.articles).filter(Boolean);

  const response: ApiResponse<ReaderData> = {
    data: { issue, spreads, sections, articles },
  };

  return NextResponse.json(response);
}
