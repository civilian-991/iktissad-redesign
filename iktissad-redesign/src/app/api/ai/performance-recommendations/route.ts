/**
 * AI Performance Recommendations API
 * POST /api/ai/performance-recommendations
 * Body: { articleId: string }
 *
 * Returns rule-based performance recommendations for a specific article,
 * computed from analytics data (views vs section avg, scroll depth, read-through).
 * No LLM call — deterministic rules for speed and cost efficiency.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationCategory =
  | "headline"
  | "internal_links"
  | "content_depth"
  | "multimedia"
  | "seo";

export interface PerformanceRecommendation {
  category: RecommendationCategory;
  titleAr: string;
  descriptionAr: string;
  impactLevel: "high" | "medium" | "low";
  actionable: boolean;
}

export interface PerformanceRecommendations {
  articleId: string;
  overallScore: number;
  performanceSummaryAr: string;
  recommendations: PerformanceRecommendation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule engine
// ─────────────────────────────────────────────────────────────────────────────

interface RuleInput {
  views: number;
  sectionAvgViews: number;
  avgScrollDepth: number;
  readThroughRate: number;
  hasFeaturedImage: boolean;
  excerptLength: number;
}

function buildRecommendations(
  input: RuleInput
): PerformanceRecommendation[] {
  const {
    views,
    sectionAvgViews,
    avgScrollDepth,
    readThroughRate,
    hasFeaturedImage,
    excerptLength,
  } = input;

  const recs: PerformanceRecommendation[] = [];

  // Rule: views < 50% of section average → headline problem
  if (sectionAvgViews > 0 && views < sectionAvgViews * 0.5) {
    recs.push({
      category: "headline",
      titleAr: "جرّب عناوين بديلة لرفع معدل النقر",
      descriptionAr:
        "المقال يحصل على زيارات أقل من نصف متوسط القسم — قد يكون العنوان الحالي لا يستقطب الاهتمام الكافي. استخدم أداة متغيرات العناوين لاختبار 5 صياغات مختلفة.",
      impactLevel: "high",
      actionable: true,
    });
  }

  // Rule: avgScrollDepth < 50 → content depth / structure issue
  if (avgScrollDepth < 50) {
    recs.push({
      category: "content_depth",
      titleAr: "حسّن بنية المقال وأضف عناوين فرعية",
      descriptionAr:
        "القراء يغادرون قبل منتصف المقال. أضف عناوين فرعية واضحة كل 3-4 فقرات، وابدأ بالمعلومة الأهم (هرم مقلوب).",
      impactLevel: "high",
      actionable: true,
    });
  }

  // Rule: readThroughRate < 40 → content depth + multimedia
  if (readThroughRate < 40) {
    recs.push({
      category: "content_depth",
      titleAr: "أضف ملخصاً نقطياً في النهاية",
      descriptionAr:
        "أقل من 40% من القراء يصلون للنهاية. أضف قسم «الخلاصة» أو «أبرز النقاط» قبل الفقرة الأخيرة لتشجيع الإكمال.",
      impactLevel: "medium",
      actionable: true,
    });

    recs.push({
      category: "multimedia",
      titleAr: "أضف جدولاً بيانياً أو إنفوغرافيك",
      descriptionAr:
        "المقالات التي تحتوي مرئيات تعليمية ترفع معدل الإكمال بنسبة 35-60%. أنشئ جدولاً أو مخططاً بيانياً من البيانات المذكورة في المقال.",
      impactLevel: "medium",
      actionable: true,
    });
  }

  // Rule: missing featured image → multimedia
  if (!hasFeaturedImage) {
    recs.push({
      category: "multimedia",
      titleAr: "أضف صورة رئيسية للمقال",
      descriptionAr:
        "المقالات بدون صورة رئيسية تحصل على 43% نقرات أقل على وسائل التواصل الاجتماعي. أضف صورة عالية الجودة ذات صلة بالموضوع.",
      impactLevel: "high",
      actionable: true,
    });
  }

  // Rule: excerpt too short → SEO
  if (excerptLength < 50) {
    recs.push({
      category: "seo",
      titleAr: "اكتب وصفاً تعريفياً أطول (Meta Description)",
      descriptionAr:
        "الوصف الحالي قصير جداً — الوصف المثالي يتراوح بين 120 و160 حرفاً ويتضمن الكلمة المفتاحية الرئيسية لتحسين ظهور المقال في نتائج البحث.",
      impactLevel: "medium",
      actionable: true,
    });
  }

  // Always: internal links recommendation
  recs.push({
    category: "internal_links",
    titleAr: "أضف روابط داخلية لمقالات ذات صلة",
    descriptionAr:
      "استخدم أداة الروابط الداخلية لإيجاد مقالات ذات صلة وربطها بالنص — يرفع وقت البقاء ويحسن ترتيب محرك البحث.",
    impactLevel: "low",
    actionable: true,
  });

  // Return up to 4 most relevant (highest impact first)
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return recs
    .sort((a, b) => impactOrder[a.impactLevel] - impactOrder[b.impactLevel])
    .slice(0, 4);
}

function buildSummaryAr(
  overallScore: number,
  views: number,
  sectionAvgViews: number
): string {
  if (overallScore >= 80) {
    return `هذا المقال يحقق أداءً ممتازاً (${overallScore}/100) — إليك اقتراحات للحفاظ على هذا المستوى:`;
  }
  if (overallScore >= 60) {
    return `هذا المقال يحقق أداءً جيداً (${overallScore}/100) مع مجال للتحسين — إليك اقتراحات:`;
  }
  if (sectionAvgViews > 0 && views < sectionAvgViews * 0.5) {
    const pct = Math.round((1 - views / sectionAvgViews) * 100);
    return `هذا المقال يحصل على ${pct}% أقل من متوسط القسم (نقاط الأداء: ${overallScore}/100) — إليك اقتراحات للتحسين:`;
  }
  return `هذا المقال يحتاج تحسيناً في عدة جوانب (نقاط الأداء: ${overallScore}/100) — إليك اقتراحات:`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).articleId !== "string"
  ) {
    return NextResponse.json(
      { error: "articleId (string) is required in the request body" },
      { status: 400 }
    );
  }

  const { articleId } = body as { articleId: string };

  const supabase = await createClient();

  try {
    // ── 1. Fetch article metadata ─────────────────────────────────────────────
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, views, featured_image, excerpt, sections!section_id(slug)")
      .eq("id", articleId)
      .single() as {
      data: {
        id: string;
        title: string;
        views: number | null;
        featured_image: string | null;
        excerpt: string | null;
        sections: { slug: string } | null;
      } | null;
      error: unknown;
    };

    if (articleError || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // ── 2. Compute section average views ─────────────────────────────────────
    const sectionSlug = article.sections?.slug;
    let sectionAvgViews = 0;

    if (sectionSlug) {
      const { data: sectionArticles } = await supabase
        .from("articles")
        .select("views, sections!section_id(slug)")
        .eq("status", "published") as {
        data: Array<{
          views: number | null;
          sections: { slug: string } | null;
        }> | null;
      };

      const sectionRows = (sectionArticles ?? []).filter(
        (a) => a.sections?.slug === sectionSlug
      );
      if (sectionRows.length > 0) {
        const totalViews = sectionRows.reduce(
          (s, a) => s + (a.views ?? 0),
          0
        );
        sectionAvgViews = Math.round(totalViews / sectionRows.length);
      }
    }

    // ── 3. Fetch article_reads analytics ─────────────────────────────────────
    const { data: reads } = await supabase
      .from("article_reads")
      .select("scroll_depth, read_through")
      .eq("article_id", articleId) as {
      data: Array<{
        scroll_depth: number | null;
        read_through: boolean | null;
      }> | null;
    };

    const readRows = reads ?? [];
    const readCount = readRows.length;

    const avgScrollDepth =
      readCount > 0
        ? Math.round(
            readRows.reduce((s, r) => s + Number(r.scroll_depth ?? 0), 0) /
              readCount
          )
        : 0;

    const readThroughCount = readRows.filter((r) => r.read_through).length;
    const readThroughRate =
      readCount > 0
        ? Math.round((readThroughCount / readCount) * 100)
        : 0;

    const views = article.views ?? 0;

    // ── 4. Compute overall score ──────────────────────────────────────────────
    // Blend: views vs section (40%) + scroll depth (30%) + read-through (30%)
    const viewsScore =
      sectionAvgViews > 0
        ? Math.min(100, Math.round((views / sectionAvgViews) * 100))
        : Math.min(100, Math.round(views / 5)); // fallback: cap at 100 for 500+ views
    const overallScore = Math.round(
      viewsScore * 0.4 + avgScrollDepth * 0.3 + readThroughRate * 0.3
    );

    // ── 5. Build recommendations ──────────────────────────────────────────────
    const hasFeaturedImage = Boolean(article.featured_image);
    const excerptLength = (article.excerpt ?? "").trim().length;

    const recommendations = buildRecommendations({
      views,
      sectionAvgViews,
      avgScrollDepth,
      readThroughRate,
      hasFeaturedImage,
      excerptLength,
    });

    const performanceSummaryAr = buildSummaryAr(overallScore, views, sectionAvgViews);

    const result: PerformanceRecommendations = {
      articleId,
      overallScore,
      performanceSummaryAr,
      recommendations,
    };

    return NextResponse.json<ApiResponse<PerformanceRecommendations>>({
      data: result,
    });
  } catch (err) {
    console.error("[performance-recommendations] error:", err);
    return NextResponse.json<ApiResponse<PerformanceRecommendations>>(
      { error: "Failed to compute performance recommendations" },
      { status: 500 }
    );
  }
}
