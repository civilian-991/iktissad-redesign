/**
 * Admin Content Gap Analysis API
 * GET /api/admin/content-gap
 *
 * Returns content coverage gap analysis:
 * - Per-section article counts vs targets (last 30 days)
 * - Per-country article counts (last 30 days)
 * - Underperforming articles (views < 50% of section average)
 * - Suggested story ideas for MENA financial journalism
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentGapData {
  coverageBySection: Array<{
    sectionName: string;
    articleCount: number;
    targetCount: number;
    gapPercentage: number;
  }>;
  coverageByCountry: Array<{
    country: string;
    articleCount: number;
    lastArticleDate: string | null;
  }>;
  underperformingArticles: Array<{
    id: string;
    title: string;
    views: number;
    avgScrollDepth: number;
    sectionAvgViews: number;
    performanceRatio: number;
    suggestions: string[];
  }>;
  suggestedStoryIdeas: Array<{
    topic: string;
    topicAr: string;
    reason: string;
    targetSection: string;
    priority: "high" | "medium" | "low";
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static story ideas (curated MENA financial journalism prompts)
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTED_STORY_IDEAS: ContentGapData["suggestedStoryIdeas"] = [
  {
    topic: "Saudi Vision 2030 Progress Update",
    topicAr: "تحديث مسيرة رؤية السعودية 2030",
    reason:
      "مؤشرات الربع الأول تُظهر تسارعاً في تنفيذ مشاريع نيوم والقطاع الترفيهي — فرصة تحليلية بارزة",
    targetSection: "markets",
    priority: "high",
  },
  {
    topic: "GCC Banking Sector Stress Test Results",
    topicAr: "نتائج اختبارات الضغط لبنوك مجلس التعاون الخليجي",
    reason:
      "البنوك المركزية الخليجية أجرت اختبارات ضغط ربع سنوية — البيانات متاحة وغير مغطاة بشكل كافٍ",
    targetSection: "banking",
    priority: "high",
  },
  {
    topic: "OPEC+ Production Decision Impact Analysis",
    topicAr: "تحليل تداعيات قرار أوبك+ على أسعار النفط",
    reason:
      "قرارات الإنتاج الأخيرة أثّرت على أسواق النفط عالمياً — القراء يبحثون عن تحليل معمّق",
    targetSection: "energy",
    priority: "high",
  },
  {
    topic: "UAE Real Estate Market Outlook 2026",
    topicAr: "توقعات سوق العقارات في الإمارات لعام 2026",
    reason:
      "ارتفاع أسعار الإيجارات في دبي وأبوظبي يستقطب اهتمام المستثمرين والمقيمين على حدٍّ سواء",
    targetSection: "real-estate",
    priority: "medium",
  },
  {
    topic: "Egypt Economic Reform: IMF Program Milestones",
    topicAr: "الإصلاح الاقتصادي في مصر: مراحل برنامج صندوق النقد الدولي",
    reason:
      "مصر تمر بمرحلة تثبيت اقتصادي حاسمة — متابعة مؤشرات البرنامج ضرورية للمستثمرين الإقليميين",
    targetSection: "macro",
    priority: "medium",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pre-computed improvement suggestions
// ─────────────────────────────────────────────────────────────────────────────

function buildSuggestions(
  views: number,
  avgScrollDepth: number,
  sectionAvgViews: number
): string[] {
  const suggestions: string[] = [];

  // Low traffic → SEO / headline
  if (views < sectionAvgViews * 0.3) {
    suggestions.push("قوّ العنوان بـ 3 بدائل باستخدام أداة متغيرات العناوين");
  }

  // Low scroll → content depth / readability
  if (avgScrollDepth < 40) {
    suggestions.push(
      "أضف جدولاً بيانياً أو مرئية لتحسين معدل التمرير"
    );
    suggestions.push("قسّم الفقرات الطويلة إلى نقاط مختصرة");
  }

  // Always suggest internal links
  suggestions.push("أضف روابط داخلية لمقالات ذات صلة لتحسين وقت البقاء");

  // Low moderate traffic — suggest promotion
  if (views < sectionAvgViews * 0.5 && views > 50) {
    suggestions.push("روّج المقال عبر النشرة البريدية أو حسابات التواصل الاجتماعي");
  }

  return suggestions.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const supabase = await createClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    // ── 1. Coverage by section (last 30 days) ────────────────────────────────
    const { data: recentArticles } = await supabase
      .from("articles")
      .select(
        "id, title, views, created_at, country, sections!section_id(name, slug)"
      )
      .gte("created_at", thirtyDaysAgo)
      .eq("status", "published") as {
      data: Array<{
        id: string;
        title: string;
        views: number | null;
        created_at: string;
        country: string | null;
        sections: { name: string; slug: string } | null;
      }> | null;
    };

    const articles = recentArticles ?? [];

    // Group by section
    const sectionMap: Record<
      string,
      { name: string; articleIds: string[] }
    > = {};
    for (const a of articles) {
      const sec = a.sections;
      if (!sec) continue;
      if (!sectionMap[sec.slug]) {
        sectionMap[sec.slug] = { name: sec.name, articleIds: [] };
      }
      sectionMap[sec.slug].articleIds.push(a.id);
    }

    const TARGET_PER_MONTH = 8;
    const coverageBySection: ContentGapData["coverageBySection"] = Object.entries(
      sectionMap
    )
      .map(([, sec]) => {
        const articleCount = sec.articleIds.length;
        const gapPercentage =
          articleCount >= TARGET_PER_MONTH
            ? 0
            : Math.round(
                ((TARGET_PER_MONTH - articleCount) / TARGET_PER_MONTH) * 100
              );
        return {
          sectionName: sec.name,
          articleCount,
          targetCount: TARGET_PER_MONTH,
          gapPercentage,
        };
      })
      .sort((a, b) => b.gapPercentage - a.gapPercentage);

    // ── 2. Coverage by country (last 30 days) ────────────────────────────────
    const countryMap: Record<
      string,
      { count: number; lastDate: string | null }
    > = {};
    for (const a of articles) {
      const c = a.country ?? "غير محدد";
      if (!countryMap[c]) countryMap[c] = { count: 0, lastDate: null };
      countryMap[c].count++;
      if (!countryMap[c].lastDate || a.created_at > countryMap[c].lastDate!) {
        countryMap[c].lastDate = a.created_at;
      }
    }

    const coverageByCountry: ContentGapData["coverageByCountry"] = Object.entries(
      countryMap
    )
      .map(([country, v]) => ({
        country,
        articleCount: v.count,
        lastArticleDate: v.lastDate,
      }))
      .sort((a, b) => b.articleCount - a.articleCount);

    // ── 3. Underperforming articles ──────────────────────────────────────────
    // Fetch all published articles with their section and reads analytics
    const { data: allPublished } = await supabase
      .from("articles")
      .select("id, title, views, sections!section_id(name, slug)")
      .eq("status", "published")
      .order("views", { ascending: true })
      .limit(200) as {
      data: Array<{
        id: string;
        title: string;
        views: number | null;
        sections: { name: string; slug: string } | null;
      }> | null;
    };

    const allArticles = allPublished ?? [];

    // Compute per-section average views
    const secViewsMap: Record<string, { total: number; count: number }> = {};
    for (const a of allArticles) {
      const slug = a.sections?.slug ?? "__none__";
      if (!secViewsMap[slug]) secViewsMap[slug] = { total: 0, count: 0 };
      secViewsMap[slug].total += a.views ?? 0;
      secViewsMap[slug].count++;
    }
    const secAvg: Record<string, number> = {};
    for (const [slug, v] of Object.entries(secViewsMap)) {
      secAvg[slug] = v.count > 0 ? v.total / v.count : 0;
    }

    // Fetch scroll depth for underperforming candidates
    const underperformingCandidates = allArticles.filter((a) => {
      const sectionSlug = a.sections?.slug ?? "__none__";
      const avg = secAvg[sectionSlug] ?? 0;
      return avg > 0 && (a.views ?? 0) < avg * 0.5;
    });

    const candidateIds = underperformingCandidates
      .slice(0, 20)
      .map((a) => a.id);

    const scrollMap: Record<string, number> = {};
    if (candidateIds.length > 0) {
      const { data: readRows } = await supabase
        .from("article_reads")
        .select("article_id, scroll_depth")
        .in("article_id", candidateIds) as {
        data: Array<{ article_id: string; scroll_depth: number | null }> | null;
      };

      // Aggregate average scroll depth per article
      const scrollAgg: Record<string, { total: number; count: number }> = {};
      for (const r of readRows ?? []) {
        if (!scrollAgg[r.article_id]) {
          scrollAgg[r.article_id] = { total: 0, count: 0 };
        }
        scrollAgg[r.article_id].total += Number(r.scroll_depth ?? 0);
        scrollAgg[r.article_id].count++;
      }
      for (const [aid, v] of Object.entries(scrollAgg)) {
        scrollMap[aid] = v.count > 0 ? Math.round(v.total / v.count) : 0;
      }
    }

    const underperformingArticles: ContentGapData["underperformingArticles"] =
      underperformingCandidates
        .slice(0, 10)
        .map((a) => {
          const sectionSlug = a.sections?.slug ?? "__none__";
          const sectionAvgViews = Math.round(secAvg[sectionSlug] ?? 0);
          const views = a.views ?? 0;
          const avgScrollDepth = scrollMap[a.id] ?? 0;
          const performanceRatio =
            sectionAvgViews > 0
              ? Math.round((views / sectionAvgViews) * 100) / 100
              : 0;

          return {
            id: a.id,
            title: a.title,
            views,
            avgScrollDepth,
            sectionAvgViews,
            performanceRatio,
            suggestions: buildSuggestions(views, avgScrollDepth, sectionAvgViews),
          };
        })
        .sort((a, b) => a.performanceRatio - b.performanceRatio);

    // ── 4. Compose response ──────────────────────────────────────────────────
    const result: ContentGapData = {
      coverageBySection,
      coverageByCountry,
      underperformingArticles,
      suggestedStoryIdeas: SUGGESTED_STORY_IDEAS,
    };

    return NextResponse.json<ApiResponse<ContentGapData>>({ data: result });
  } catch (err) {
    console.error("[content-gap] error:", err);
    return NextResponse.json<ApiResponse<ContentGapData>>(
      { error: "Failed to fetch content gap data" },
      { status: 500 }
    );
  }
}
