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

// Heuristic for titles damaged by the FFFD→space cleanup. The damaged
// pattern is "<short Arabic cluster> SPACE <short Arabic cluster>" where
// neither cluster is a common Arabic word — normal Arabic prose has many
// 2-letter words (في، من، إلى) so we explicitly skip those.
const ARABIC_STOPWORDS = new Set([
  "في","من","إلى","على","عن","ما","لا","لم","لن","قد","هل","أو","لو",
  "ال","و","ب","ف","ك","ل","فى","الى","يا","يأ","يس",
]);
function looksDamaged(title: string): boolean {
  if (!title) return false;
  // Each pair-of-short-clusters candidate; verify it's not two real stopwords.
  const re = /(^|[^ا-ي])([ا-ي]{1,3})\s([ا-ي]{1,3})(?=$|[^ا-ي])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title)) !== null) {
    const left = m[2];
    const right = m[3];
    // If either side is a single Arabic letter that's not a 1-letter
    // preposition (و، ف، ل، ب، ك) or both sides are short non-words,
    // it's likely damage.
    const leftIsWord = ARABIC_STOPWORDS.has(left);
    const rightIsWord = ARABIC_STOPWORDS.has(right);
    if (leftIsWord && rightIsWord) continue;
    if (left.length === 1 && !"وفلبك".includes(left)) return true;
    if (right.length === 1 && !"وفلبك".includes(right)) return true;
    if (!leftIsWord && !rightIsWord && left.length <= 2 && right.length <= 2) return true;
  }
  return false;
}

function stripHtml(s: string): string {
  return s.replace(/<\/?[a-zA-Z][^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Algorithmic reconstruction: for each candidate "<left> <right>" pair in
// the title that looks damaged, search the body for a single Arabic word
// that starts with `left` and ends with `right`. If found, substitute it
// back. Returns the rewritten title (or null if no substitutions made).
function reconstructFromBody(title: string, body: string): string | null {
  const bodyText = stripHtml(body || "");
  if (!bodyText) return null;
  // Pull every Arabic-letter run from the body (with diacritics + hamza forms).
  const bodyWords = bodyText.match(/[ء-ي٠-٩]+/g) || [];
  if (!bodyWords.length) return null;

  let out = title;
  let changed = false;

  // Walk the title — each `${left} ${right}` pair where both halves are
  // short and at least one is not a stopword.
  const pairRe = /([ء-ي]{1,3})\s([ء-ي]{1,3})/g;
  let m: RegExpExecArray | null;
  const replacements: Array<{ from: string; to: string }> = [];
  while ((m = pairRe.exec(title)) !== null) {
    const left = m[1];
    const right = m[2];
    const leftIsWord = ARABIC_STOPWORDS.has(left);
    const rightIsWord = ARABIC_STOPWORDS.has(right);
    if (leftIsWord && rightIsWord) continue;
    // 1-letter prepositions (و، ف، ل، ب، ك) are valid on their own — skip.
    if (left.length === 1 && "وفلبك".includes(left) && !rightIsWord && right.length >= 3) continue;
    if (right.length === 1 && "وفلبك".includes(right)) continue;

    // Search body for a word that starts with left, ends with right, isn't
    // just the concatenation (the original word had at least one missing char).
    const matches = bodyWords.filter(
      (w) => w.length > left.length + right.length && w.startsWith(left) && w.endsWith(right)
    );
    if (!matches.length) continue;
    // Pick the shortest unique match — that's the most conservative guess.
    matches.sort((a, b) => a.length - b.length);
    const pick = matches[0];

    replacements.push({ from: `${left} ${right}`, to: pick });
  }

  // Apply replacements (longest from-string first so longer pairs win when
  // they overlap).
  replacements.sort((a, b) => b.from.length - a.from.length);
  for (const r of replacements) {
    if (out.includes(r.from)) {
      out = out.replace(r.from, r.to);
      changed = true;
    }
  }

  return changed ? out : null;
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
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Claude ${res.status}: ${errBody.slice(0, 200)}`);
  }
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
  // Punch-list mode: skip Claude entirely, just return every damaged
  // candidate with an excerpt for manual correction.
  const punchList = searchParams.get("punchList") === "1";
  // Algorithmic mode: reconstruct titles by searching the body for a
  // word matching the broken left/right halves — no AI call needed.
  const algo = searchParams.get("algo") === "1";
  // Narrow to articles whose updated_at is more recent than this cutoff.
  // Default: 1 day ago — captures recently-cleaned articles, skips the
  // long tail of clean ones that happen to match the heuristic.
  const sinceHoursParam = parseInt(searchParams.get("sinceHours") || "24", 10);
  const sinceHours = Number.isFinite(sinceHoursParam) && sinceHoursParam > 0 ? sinceHoursParam : 24;
  const sinceIso = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();

  const admin = createAdminClient();

  // 1) Pull every existing slug (cheap — just one column) for uniqueness check.
  const slugOwner = new Map<string, string>();
  {
    const chunk = 1000;
    for (let off = 0; ; off += chunk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin.from("articles") as any)
        .select("id, slug")
        .order("id", { ascending: true })
        .range(off, off + chunk - 1);
      const list = (data ?? []) as Array<{ id: string; slug: string }>;
      for (const r of list) slugOwner.set(r.slug, r.id);
      if (list.length < chunk) break;
    }
  }

  // 2) Pull only recently-touched rows for candidate evaluation.
  const rows: Array<{ id: string; slug: string; title: string; content: string | null; source_id: number | null }> = [];
  {
    const chunk = 1000;
    for (let off = 0; ; off += chunk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin.from("articles") as any)
        .select("id, slug, title, content, source_id")
        .gte("updated_at", sinceIso)
        .order("id", { ascending: true })
        .range(off, off + chunk - 1);
      const list = (data ?? []) as typeof rows;
      rows.push(...list);
      if (list.length < chunk) break;
    }
  }

  const candidates = rows.filter((r) => looksDamaged(r.title));

  // Punch-list mode: return all candidates with body excerpts; no AI calls.
  if (punchList) {
    return NextResponse.json({
      data: {
        sinceIso,
        recentRows: rows.length,
        candidates: candidates.length,
        items: candidates.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: stripHtml(r.content || "").slice(0, 240),
          editUrl: `/admin/articles/${r.id}`,
          publicUrl: `/${r.slug}`,
        })),
      },
    });
  }

  const target = limit > 0 ? candidates.slice(0, limit) : candidates;

  // Algorithmic mode: no Claude calls, search body for matching words.
  if (algo) {
    const algoResults: Array<{
      id: string;
      titleBefore: string;
      titleAfter: string;
      slugBefore: string;
      slugAfter: string;
      accepted: boolean;
    }> = [];
    let applied = 0;
    for (const r of target) {
      const newTitle = reconstructFromBody(r.title, r.content || "");
      if (!newTitle || newTitle === r.title) {
        algoResults.push({
          id: r.id, titleBefore: r.title, titleAfter: r.title,
          slugBefore: r.slug, slugAfter: r.slug, accepted: false,
        });
        continue;
      }
      // Regenerate slug, resolve collisions.
      let newSlug = slugify(newTitle) || r.slug;
      if (newSlug !== r.slug) {
        const owner = slugOwner.get(newSlug);
        if (owner && owner !== r.id) {
          const tail = r.source_id != null ? String(r.source_id) : r.id.slice(0, 8);
          newSlug = `${newSlug}-${tail}`;
        }
      }
      algoResults.push({
        id: r.id, titleBefore: r.title, titleAfter: newTitle,
        slugBefore: r.slug, slugAfter: newSlug, accepted: true,
      });
      if (newSlug !== r.slug) {
        slugOwner.delete(r.slug);
        slugOwner.set(newSlug, r.id);
      }
      if (!dryRun) {
        const patch: Record<string, unknown> = { title: newTitle };
        if (newSlug !== r.slug) patch.slug = newSlug;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin.from("articles") as any).update(patch).eq("id", r.id);
        if (error) {
          return NextResponse.json(
            { error: `Update failed for ${r.id}: ${error.message} (applied: ${applied})` } satisfies ApiResponse<never>,
            { status: 500 }
          );
        }
        applied++;
      }
    }
    return NextResponse.json({
      data: {
        mode: "algorithmic",
        dryRun,
        candidates: candidates.length,
        attempted: algoResults.length,
        accepted: algoResults.filter((r) => r.accepted).length,
        rejected: algoResults.filter((r) => !r.accepted).length,
        applied,
        sample: algoResults.slice(0, 15).map((r) => ({
          id: r.id,
          titleBefore: r.titleBefore.slice(0, 130),
          titleAfter: r.titleAfter.slice(0, 130),
          slugAfter: r.slugAfter.slice(0, 130),
          accepted: r.accepted,
        })),
      },
    });
  }

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
      sinceIso,
      recentRows: rows.length,
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
