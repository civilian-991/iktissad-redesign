import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";
import type { ApiResponse } from "@/types";

/**
 * Bulk cleanup of legacy-imported articles. Fixes:
 *  - HTML/entities/replacement-chars in titles
 *  - Slugs containing leftover `br` tokens or stale punctuation
 *  - Redundant dir="RTL" attributes in body HTML
 *
 * POST /api/admin/articles-cleanup
 *   ?dryRun=1 — count changes without writing
 *   ?limit=<n> — process at most n articles (for testing)
 */

const ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&(nbsp|amp|quot|apos|lt|gt);/gi, (_m, name) => ENTITY_MAP[name.toLowerCase()] ?? "")
    .replace(/&#(\d+);/g, (_m, dec) => {
      const n = parseInt(dec, 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    });
}

function cleanTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return decodeEntities(raw)
    // malformed <br< → space (importer artefact)
    .replace(/<br[^a-zA-Z>]/gi, " ")
    // proper <br>, <br/>, <br /> → space
    .replace(/<br\s*\/?>/gi, " ")
    // any remaining well-formed tags
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    // replacement chars (U+FFFD) — bytes are lost, blank them out
    .replace(/�+/g, " ")
    // zero-width chars + soft hyphens
    .replace(/[​-‏­]/g, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBody(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    // Drop redundant dir="RTL"/dir='RTL' attributes — the site is RTL globally.
    .replace(/\s+dir\s*=\s*["']?RTL["']?/gi, "")
    // Strip the same replacement chars from body too.
    .replace(/�/g, "");
}

function looksDirty(title: string, slug: string, body: string): boolean {
  return (
    /[�]/.test(title) ||
    /<[a-zA-Z]/.test(title) ||
    /&(nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-fA-F]+);/.test(title) ||
    /(^|-)br(-|$)/.test(slug) ||
    /\sdir\s*=\s*["']?RTL["']?/i.test(body)
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const limit = Math.max(0, parseInt(searchParams.get("limit") || "0", 10));

  const admin = createAdminClient();

  // 1) Drain every article (id, slug, title, content, source_id) for the in-memory
  //    slug-uniqueness check. Pull in 1000-row pages, ordered by id for stability.
  const rows: Array<{
    id: string;
    slug: string;
    title: string;
    content: string | null;
    source_id: number | null;
  }> = [];
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

  // 2) Build the in-memory slug set so we can detect new collisions.
  const slugOwner = new Map<string, string>(); // slug → article id
  for (const r of rows) slugOwner.set(r.slug, r.id);

  const updates: Array<{
    id: string;
    titleBefore: string;
    titleAfter: string;
    slugBefore: string;
    slugAfter: string;
    contentChanged: boolean;
  }> = [];

  let dirtyCount = 0;
  let titleFixed = 0;
  let slugFixed = 0;
  let bodyFixed = 0;
  let processed = 0;

  for (const r of rows) {
    const dirty = looksDirty(r.title || "", r.slug || "", r.content || "");
    if (dirty) dirtyCount++;
    if (!dirty) continue;

    const newTitle = cleanTitle(r.title);
    const newBody = cleanBody(r.content);

    // Recompute slug from cleaned title. If it collides, disambiguate by
    // source_id (always present on imported articles) or short id slice.
    let newSlug = slugify(newTitle);
    if (!newSlug) newSlug = r.slug; // shouldn't happen but guard
    if (newSlug !== r.slug) {
      const owner = slugOwner.get(newSlug);
      if (owner && owner !== r.id) {
        const tail = r.source_id != null ? String(r.source_id) : r.id.slice(0, 8);
        newSlug = `${newSlug}-${tail}`;
      }
    }

    const titleChanged = newTitle !== r.title && newTitle.length > 0;
    const slugChanged = newSlug !== r.slug && newSlug.length > 0;
    const contentChanged = newBody !== (r.content || "");

    if (!titleChanged && !slugChanged && !contentChanged) continue;

    if (titleChanged) titleFixed++;
    if (slugChanged) slugFixed++;
    if (contentChanged) bodyFixed++;

    updates.push({
      id: r.id,
      titleBefore: r.title,
      titleAfter: newTitle,
      slugBefore: r.slug,
      slugAfter: newSlug,
      contentChanged,
    });

    // Reserve the new slug so subsequent articles see it.
    if (slugChanged) {
      slugOwner.delete(r.slug);
      slugOwner.set(newSlug, r.id);
    }

    processed++;
    if (limit > 0 && processed >= limit) break;
  }

  // 3) Apply (one row at a time — atomic per article and easier to debug if it fails).
  let applied = 0;
  if (!dryRun) {
    for (const u of updates) {
      const patch: Record<string, unknown> = {};
      if (u.titleAfter && u.titleAfter !== u.titleBefore) patch.title = u.titleAfter;
      if (u.slugAfter && u.slugAfter !== u.slugBefore) patch.slug = u.slugAfter;
      if (u.contentChanged) {
        // Re-derive cleaned body for this row.
        const row = rows.find((r) => r.id === u.id);
        patch.content = cleanBody(row?.content);
      }
      if (Object.keys(patch).length === 0) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from("articles") as any).update(patch).eq("id", u.id);
      if (error) {
        return NextResponse.json(
          { error: `Update failed for ${u.id}: ${error.message} (applied so far: ${applied})` } satisfies ApiResponse<never>,
          { status: 500 }
        );
      }
      applied++;
    }
  }

  return NextResponse.json({
    data: {
      dryRun,
      total: rows.length,
      dirty: dirtyCount,
      changed: updates.length,
      titleFixed,
      slugFixed,
      bodyFixed,
      applied,
      sample: updates.slice(0, 5).map((u) => ({
        id: u.id,
        titleBefore: u.titleBefore.slice(0, 100),
        titleAfter: u.titleAfter.slice(0, 100),
        slugBefore: u.slugBefore.slice(0, 100),
        slugAfter: u.slugAfter.slice(0, 100),
      })),
    },
  });
}
