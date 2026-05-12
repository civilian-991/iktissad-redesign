import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";
import type { ApiResponse } from "@/types";

// Reconstruction calls Claude per article — bump the function ceiling so
// a full batch of ~60 articles fits comfortably in one request.
export const maxDuration = 600;

/**
 * AI-driven reconstruction of titles damaged during legacy import.
 *
 * The previous cleanup endpoint replaced U+FFFD replacement chars with
 * spaces, leaving titles like "ب ك قطر الوطني" (should be "بنك قطر الوطني").
 * The lost bytes can't be recovered from the title alone, so we ask Claude
 * to reconstruct the title using the article body as context.
 *
 * POST /api/admin/articles-reconstruct
 *   ?dryRun=1 — preview without writing
 *   ?limit=<n> — process at most n articles
 */

// Heuristic: titles with isolated short Arabic-letter clusters (1-2 chars)
// adjacent to other short Arabic clusters separated by a single space —
// almost always a damaged word from the U+FFFD → space replacement.
function looksDamaged(title: string): boolean {
  if (!title) return false;
  // Look for the pattern: short Arabic cluster (1-2 letters), space, short cluster
  // Match within the title body (not at edges).
  return /(^|[^ا-ي])[ا-ي]{1,2}\s[ا-ي]{1,3}(?=$|[^ا-ي])/.test(title);
}

function stripHtml(s: string): string {
  return s.replace(/<\/?[a-zA-Z][^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system:
        "You are an Arabic editor for IKTISSAD, a financial news site. The user will give you a broken Arabic article title where one or more characters were lost during import (showing as awkward spaces inside what should be single words), plus the opening of the article. Reconstruct the correct title. Output ONLY the corrected title in Arabic — no quotes, no explanation, no prefix.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text: string = data?.content?.[0]?.type === "text" ? data.content[0].text : "";
  return text.trim();
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" } satisfies ApiResponse<never>,
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const limit = Math.max(0, parseInt(searchParams.get("limit") || "0", 10));

  const admin = createAdminClient();

  // 1) Drain all articles for slug-uniqueness check.
  const rows: Array<{ id: string; slug: string; title: string; content: string | null; source_id: number | null }> = [];
  {
    const chunk = 1000;
    for (let off = 0; ; off += chunk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin.from("articles") as any)
        .select("id, slug, title, content, source_id")
        .order("id", { ascending: true })
        .range(off, off + chunk - 1);
      const list = (data ?? []) as typeof rows;
      rows.push(...list);
      if (list.length < chunk) break;
    }
  }

  const slugOwner = new Map<string, string>();
  for (const r of rows) slugOwner.set(r.slug, r.id);

  // 2) Pick candidates.
  const candidates = rows.filter((r) => looksDamaged(r.title));
  const target = limit > 0 ? candidates.slice(0, limit) : candidates;

  // 3) Reconstruct.
  const results: Array<{
    id: string;
    titleBefore: string;
    titleAfter: string;
    slugBefore: string;
    slugAfter: string;
    aiAccepted: boolean;
    reason?: string;
  }> = [];

  for (const r of target) {
    const bodyText = stripHtml(r.content || "").slice(0, 1500);
    const prompt = `Broken title:\n${r.title}\n\nArticle body (Arabic):\n${bodyText}\n\nReturn ONLY the corrected title in Arabic.`;

    let aiTitle = "";
    try {
      aiTitle = await callClaude(prompt, apiKey);
    } catch (err) {
      results.push({
        id: r.id,
        titleBefore: r.title,
        titleAfter: "",
        slugBefore: r.slug,
        slugAfter: r.slug,
        aiAccepted: false,
        reason: err instanceof Error ? err.message : "ai-error",
      });
      continue;
    }

    // Validate: must be non-empty, no replacement chars, no HTML, similar length.
    const accept =
      aiTitle.length > 0 &&
      aiTitle.length < 300 &&
      !aiTitle.includes("�") &&
      !/<[a-zA-Z]/.test(aiTitle) &&
      // not wildly longer or shorter than original
      aiTitle.length >= r.title.length * 0.7 &&
      aiTitle.length <= r.title.length * 1.5;

    if (!accept) {
      results.push({
        id: r.id,
        titleBefore: r.title,
        titleAfter: aiTitle,
        slugBefore: r.slug,
        slugAfter: r.slug,
        aiAccepted: false,
        reason: "validation-failed",
      });
      continue;
    }

    let newSlug = slugify(aiTitle);
    if (!newSlug) newSlug = r.slug;
    if (newSlug !== r.slug) {
      const owner = slugOwner.get(newSlug);
      if (owner && owner !== r.id) {
        const tail = r.source_id != null ? String(r.source_id) : r.id.slice(0, 8);
        newSlug = `${newSlug}-${tail}`;
      }
    }

    results.push({
      id: r.id,
      titleBefore: r.title,
      titleAfter: aiTitle,
      slugBefore: r.slug,
      slugAfter: newSlug,
      aiAccepted: true,
    });

    if (newSlug !== r.slug) {
      slugOwner.delete(r.slug);
      slugOwner.set(newSlug, r.id);
    }
  }

  // 4) Apply.
  let applied = 0;
  if (!dryRun) {
    for (const u of results) {
      if (!u.aiAccepted) continue;
      const patch: Record<string, unknown> = { title: u.titleAfter };
      if (u.slugAfter !== u.slugBefore) patch.slug = u.slugAfter;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from("articles") as any).update(patch).eq("id", u.id);
      if (error) {
        return NextResponse.json(
          { error: `Update failed for ${u.id}: ${error.message} (applied: ${applied})` } satisfies ApiResponse<never>,
          { status: 500 }
        );
      }
      applied++;
    }
  }

  return NextResponse.json({
    data: {
      dryRun,
      candidates: candidates.length,
      attempted: results.length,
      accepted: results.filter((r) => r.aiAccepted).length,
      rejected: results.filter((r) => !r.aiAccepted).length,
      applied,
      sample: results.slice(0, 10).map((r) => ({
        id: r.id,
        titleBefore: r.titleBefore.slice(0, 120),
        titleAfter: r.titleAfter.slice(0, 120),
        slugAfter: r.slugAfter.slice(0, 120),
        aiAccepted: r.aiAccepted,
        reason: r.reason,
      })),
    },
  });
}
