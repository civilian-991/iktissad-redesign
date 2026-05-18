/**
 * GET /api/admin/analytics/seo-scores
 *
 * SEO score for each published article based on:
 *  - Title length (50-60 chars ideal)
 *  - Meta description present & 120-160 chars
 *  - Featured image present
 *  - meta_title present
 *  - meta_description present
 *
 * Tables: articles
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ──────────────────────────────────────────────────────

export interface SeoCheck {
  label: string;
  status: "good" | "needs_work" | "missing";
  detail: string;
}

export interface ArticleSeoScore {
  id: string;
  title: string;
  slug: string;
  score: number; // 0-100
  checks: SeoCheck[];
  publishedAt: string | null;
}

// ─── Score Computation ──────────────────────────────────────────

function computeSeoScore(article: any): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  let points = 0;
  const maxPoints = 5;

  // 1. Title length (ideal: 50-60 chars)
  const titleLen = (article.title ?? "").length;
  if (titleLen >= 50 && titleLen <= 60) {
    checks.push({ label: "titleLength", status: "good", detail: `${titleLen} chars` });
    points += 1;
  } else if (titleLen >= 30 && titleLen <= 80) {
    checks.push({ label: "titleLength", status: "needs_work", detail: `${titleLen} chars (ideal: 50-60)` });
    points += 0.5;
  } else {
    checks.push({ label: "titleLength", status: "missing", detail: `${titleLen} chars (ideal: 50-60)` });
  }

  // 2. Meta description
  const metaDesc = article.meta_description ?? "";
  if (metaDesc.length >= 120 && metaDesc.length <= 160) {
    checks.push({ label: "metaDescription", status: "good", detail: `${metaDesc.length} chars` });
    points += 1;
  } else if (metaDesc.length > 0) {
    checks.push({ label: "metaDescription", status: "needs_work", detail: `${metaDesc.length} chars (ideal: 120-160)` });
    points += 0.5;
  } else {
    checks.push({ label: "metaDescription", status: "missing", detail: "Not set" });
  }

  // 3. Featured image
  const featuredImage = article.featured_image ?? "";
  if (featuredImage.length > 0) {
    checks.push({ label: "featuredImage", status: "good", detail: "Present" });
    points += 1;
  } else {
    checks.push({ label: "featuredImage", status: "missing", detail: "No image set" });
  }

  // 4. Meta title (SEO override title)
  const metaTitle = article.meta_title ?? "";
  if (metaTitle.length >= 30 && metaTitle.length <= 70) {
    checks.push({ label: "metaTitle", status: "good", detail: `${metaTitle.length} chars` });
    points += 1;
  } else if (metaTitle.length > 0) {
    checks.push({ label: "metaTitle", status: "needs_work", detail: `${metaTitle.length} chars (ideal: 30-70)` });
    points += 0.5;
  } else {
    checks.push({ label: "metaTitle", status: "missing", detail: "Uses article title as fallback" });
  }

  // 5. Excerpt (used as og:description fallback)
  const excerpt = article.excerpt ?? "";
  if (excerpt.length >= 50) {
    checks.push({ label: "excerpt", status: "good", detail: `${excerpt.length} chars` });
    points += 1;
  } else if (excerpt.length > 0) {
    checks.push({ label: "excerpt", status: "needs_work", detail: `${excerpt.length} chars (min 50)` });
    points += 0.5;
  } else {
    checks.push({ label: "excerpt", status: "missing", detail: "No excerpt" });
  }

  return {
    score: Math.round((points / maxPoints) * 100),
    checks,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin", "editor", "writer"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const admin = createAdminClient();
  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get("page") ?? "1", 10);
  const pageSize = Math.min(parseInt(params.get("pageSize") ?? "20", 10), 100);
  const sortBy = params.get("sortBy") ?? "score"; // score | date

  try {
    // Fetch published articles with SEO-relevant fields
    const { data: articles, count, error } = await (admin as any)
      .from("articles")
      .select(
        "id, title, slug, meta_title, meta_description, featured_image, excerpt, published_at",
        { count: "exact" }
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const scored: ArticleSeoScore[] = (articles ?? []).map((a: any) => {
      const { score, checks } = computeSeoScore(a);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        score,
        checks,
        publishedAt: a.published_at,
      };
    });

    // Sort by score ascending (worst first) or date
    if (sortBy === "score") {
      scored.sort((a, b) => a.score - b.score);
    }

    return NextResponse.json({
      data: scored,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    } satisfies ApiResponse<ArticleSeoScore[]>);
  } catch (err) {
    console.error("[seo-scores]", err);
    return NextResponse.json(
      { error: "Failed to compute SEO scores" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
