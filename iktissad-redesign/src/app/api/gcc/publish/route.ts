/**
 * POST /api/gcc/publish — publish a stored generated draft into `articles`.
 *
 * Called by the n8n Responder on ✅نشر (secret-header auth). Publishes the FULL
 * stored draft (all CMS fields), not a reconstruction from Telegram text.
 *
 * HARD GATE (plan v4 §2.3): refuses to publish if the draft's verifier verdict
 * was not publishable (MISSING/CONTRADICTED numbers), unless override:true.
 * Logs the approval decision + updates the generated-article + review-bundle
 * status + audit. Idempotent: re-publishing returns the existing article.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  generatedArticleId: z.string().uuid(),
  override: z.boolean().optional(),
  decidedBy: z.string().optional(),
});

/** Minimal, safe Markdown → HTML for the article body. */
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (md || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const h = block.match(/^(#{2,3})\s+(.*)$/);
      if (h) return `<h${h[1].length}>${esc(h[2])}</h${h[1].length}>`;
      return `<p>${esc(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

export async function POST(request: NextRequest) {
  const denied = checkGccSecret(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }
  const { generatedArticleId, override, decidedBy } = parsed.data;
  const admin = createAdminClient();

  // 1. Load the generated article.
  const { data: gen, error: genErr } = await (admin.from('gcc_generated_articles') as any)
    .select('id, draft, fact_check, status, article_id, story_budget_id')
    .eq('id', generatedArticleId)
    .single();
  if (genErr || !gen) {
    return NextResponse.json({ error: 'generated article not found' }, { status: 404 });
  }

  // Idempotent: already published.
  if (gen.article_id) {
    return NextResponse.json({ data: { articleId: gen.article_id, alreadyPublished: true } });
  }

  // 2. HARD GATE — refuse blocked drafts unless overridden.
  const publishable = gen.fact_check?.publishable !== false;
  if (!publishable && !override) {
    return NextResponse.json(
      { error: 'blocked', blocked: true, blockers: gen.fact_check?.blockers ?? [] },
      { status: 409 }
    );
  }

  // 3. Build + insert the article (all CMS fields).
  const d = gen.draft || {};
  const slug = `${(d.slug || 'gcc-news').slice(0, 80)}-${generatedArticleId.slice(0, 6)}`;
  const insertRow: Record<string, unknown> = {
    slug,
    title: d.title || 'خبر',
    deck: d.deck || null,
    content: mdToHtml(d.body_md || ''),
    excerpt: (d.tldr || d.deck || d.title || '').slice(0, 280),
    summary: d.tldr || null,
    meta_title: d.meta_title || d.title || null,
    meta_description: d.meta_description || d.tldr || null,
    tags: Array.isArray(d.tags) ? d.tags : [],
    featured_image: d.og_image_url || null,
    og_image: d.og_image_url || null,
    status: 'published',
    published_at: new Date().toISOString(),
    article_type: 'news',
    source_site: 'تداول عبر مباشر',
  };

  const { data: article, error: insErr } = await (admin.from('articles') as any)
    .insert(insertRow)
    .select('id, slug')
    .single();
  if (insErr || !article) {
    return NextResponse.json({ error: `publish failed: ${insErr?.message}` }, { status: 500 });
  }

  // 4. Update statuses + review bundle.
  await (admin.from('gcc_generated_articles') as any)
    .update({ status: 'published', article_id: article.id })
    .eq('id', generatedArticleId);
  await (admin.from('gcc_review_bundles') as any)
    .update({ status: 'approved' })
    .eq('generated_article_id', generatedArticleId)
    .eq('status', 'active');

  // 5. Log the approval decision (the feedback corpus) + audit.
  let category: string | null = null;
  if (gen.story_budget_id) {
    const { data: budget } = await (admin.from('gcc_story_budget') as any)
      .select('story_type')
      .eq('id', gen.story_budget_id)
      .maybeSingle();
    category = budget?.story_type ?? null;
  }
  await (admin.from('gcc_editorial_decisions') as any).insert({
    generated_article_id: generatedArticleId,
    category,
    action: 'approved',
    decided_by: decidedBy ?? null,
  });
  await (admin.from('gcc_audit_log') as any).insert({
    actor_type: 'human',
    actor_id: decidedBy ?? 'editor',
    action: override ? 'publish:override' : 'publish',
    object_type: 'gcc_generated_article',
    object_id: generatedArticleId,
    details: { article_id: article.id, slug: article.slug },
    override_flag: !!override,
  });

  return NextResponse.json({ data: { articleId: article.id, slug: article.slug, published: true } });
}
