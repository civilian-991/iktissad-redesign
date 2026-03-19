import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const internalLinksSchema = z.object({
  title: z.string(),
  content: z.string(),
  targetKeyword: z.string().optional(),
  currentArticleId: z.string().optional(),
});

type InternalLinksInput = z.infer<typeof internalLinksSchema>;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface InternalLinkSuggestion {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  views: number;
}

export interface InternalLinksResult {
  suggestions: InternalLinkSuggestion[];
  /** true if fewer than 2 suggestions were found */
  insufficient: boolean;
}

// ---------------------------------------------------------------------------
// Arabic stopwords to strip before keyword extraction
// ---------------------------------------------------------------------------

const ARABIC_STOPWORDS = new Set([
  "في",
  "من",
  "إلى",
  "على",
  "عن",
  "مع",
  "هذا",
  "هذه",
  "التي",
  "الذي",
  "وهو",
  "وهي",
  "أن",
  "إن",
  "كان",
  "كانت",
  "يكون",
  "تكون",
  "قد",
  "لا",
  "لم",
  "لن",
  "ما",
  "ال",
  "و",
  "أو",
  "ثم",
  "حتى",
  "بعد",
  "قبل",
  "بين",
  "عند",
  "عنده",
  "كل",
  "بعض",
  "هم",
  "هن",
  "هو",
  "هي",
  "نحن",
  "أنا",
  "أنت",
  "أنتم",
]);

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

/**
 * Extract the 3–5 most meaningful words from a title string.
 * Strips Arabic stopwords, Arabic diacritics, and very short tokens.
 * Deduplicates while preserving order of first appearance.
 */
function extractKeywords(title: string, extraKeyword?: string): string[] {
  // Combine title with optional target keyword
  const combined = [title, extraKeyword ?? ""].join(" ");

  // Strip Arabic diacritics (tashkeel)
  const stripped = combined.replace(/[\u0610-\u061A\u064B-\u065F]/g, "");

  const tokens = stripped
    .trim()
    .split(/[\s\u200c\u200d\u00a0،,،.!?؟]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3) // drop very short tokens
    .filter((t) => !ARABIC_STOPWORDS.has(t));

  // Deduplicate, preserving first-seen order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  }

  // Return at most 5 keywords
  return unique.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = internalLinksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { title, content, targetKeyword, currentArticleId }: InternalLinksInput =
    parsed.data;

  // Build the keyword list from title + optional target keyword
  const keywords = extractKeywords(title, targetKeyword);

  // If we could not extract any meaningful keywords, return empty results
  if (keywords.length === 0) {
    const result: InternalLinksResult = { suggestions: [], insufficient: true };
    return NextResponse.json(
      { data: result } satisfies ApiResponse<InternalLinksResult>
    );
  }

  // Build the OR filter: each keyword matches against title OR excerpt
  // e.g. "title.ilike.%النفط%,excerpt.ilike.%النفط%"
  const orFilter = keywords
    .map((kw) => `title.ilike.%${kw}%,excerpt.ilike.%${kw}%`)
    .join(",");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("articles")
    .select("id, slug, title, excerpt, views, section_id")
    .eq("status", "published")
    .or(orFilter)
    .order("views", { ascending: false })
    .limit(5);

  // Exclude the article being edited (if provided and non-empty)
  if (currentArticleId && currentArticleId.trim().length > 0) {
    query = query.neq("id", currentArticleId.trim());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "فشل البحث عن المقالات المرتبطة" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Map DB rows to the response shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestions: InternalLinkSuggestion[] = ((data as any[]) ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any) => ({
      id: row.id as string,
      title: (row.title as string) ?? "",
      slug: (row.slug as string) ?? "",
      excerpt: (row.excerpt as string) ?? "",
      views: (row.views as number) ?? 0,
    })
  );

  const result: InternalLinksResult = {
    suggestions,
    insufficient: suggestions.length < 2,
  };

  // Suppress unused variable lint warning — content is accepted for future
  // semantic matching expansion but is not used in the current ilike approach.
  void content;

  return NextResponse.json(
    { data: result } satisfies ApiResponse<InternalLinksResult>
  );
}
