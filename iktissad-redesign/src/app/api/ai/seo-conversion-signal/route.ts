import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const conversionSignalSchema = z.object({
  sectionSlug: z.string().optional(),
  articleType: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ConversionInsight {
  label: string;   // Arabic insight text
  value: string;   // e.g. "2.3x" or "67%"
  type: "positive" | "neutral" | "warning";
}

export interface ConversionSignalResult {
  insights: ConversionInsight[];
  insufficient: boolean;
  sectionArticleCount: number;
}

// ---------------------------------------------------------------------------
// Arabic labels for article_type values
// ---------------------------------------------------------------------------

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  news: "الأخبار",
  report: "التقارير",
  analysis: "التحليلات",
  interview: "المقابلات",
  opinion: "المقالات الرأي",
};

function typeLabel(type: string): string {
  return ARTICLE_TYPE_LABELS[type] ?? type;
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

  const parsed = conversionSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { sectionSlug, articleType } = parsed.data;

  // Early exit — no section means we can't produce section-level signals
  if (!sectionSlug) {
    const result: ConversionSignalResult = {
      insights: [],
      insufficient: true,
      sectionArticleCount: 0,
    };
    return NextResponse.json(
      { data: result } satisfies ApiResponse<ConversionSignalResult>
    );
  }

  const supabase = await createClient();

  // Resolve slug → UUID
  const { data: sectionRow } = await supabase
    .from("sections")
    .select("id")
    .eq("slug", sectionSlug)
    .single() as { data: { id: string } | null; error: unknown };

  const sectionId = sectionRow?.id;
  if (!sectionId) {
    const result: ConversionSignalResult = {
      insights: [],
      insufficient: true,
      sectionArticleCount: 0,
    };
    return NextResponse.json(
      { data: result } satisfies ApiResponse<ConversionSignalResult>
    );
  }

  // -------------------------------------------------------------------------
  // Query 1 — Section aggregate: avg views + article count
  // -------------------------------------------------------------------------

  const { data: aggRows, error: aggError } = await supabase
    .from("articles")
    .select("views")
    .eq("section_id", sectionId)
    .eq("status", "published") as { data: Array<{ views: number }> | null; error: unknown };

  if (aggError) {
    return NextResponse.json(
      { error: "فشل استعلام قاعدة البيانات" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const rows = aggRows ?? [];
  const articleCount = rows.length;

  // Require at least 5 published articles to produce meaningful signals
  if (articleCount < 5) {
    const result: ConversionSignalResult = {
      insights: [],
      insufficient: true,
      sectionArticleCount: articleCount,
    };
    return NextResponse.json(
      { data: result } satisfies ApiResponse<ConversionSignalResult>
    );
  }

  const totalViews = rows.reduce((sum, r) => sum + (r.views ?? 0), 0);
  const avgViews = totalViews / articleCount;

  // -------------------------------------------------------------------------
  // Query 2 — Top 3 articles by views in this section
  // -------------------------------------------------------------------------

  const { data: topRows, error: topError } = await supabase
    .from("articles")
    .select("title, views, article_type")
    .eq("section_id", sectionId)
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(3) as {
      data: Array<{ title: string; views: number; article_type: string | null }> | null;
      error: unknown;
    };

  if (topError) {
    return NextResponse.json(
      { error: "فشل استعلام قاعدة البيانات" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const topArticles = topRows ?? [];

  // -------------------------------------------------------------------------
  // Query 3 — Average views grouped by article_type in this section
  // -------------------------------------------------------------------------

  const { data: typeRows, error: typeError } = await supabase
    .from("articles")
    .select("article_type, views")
    .eq("section_id", sectionId)
    .eq("status", "published")
    .not("article_type", "is", null) as {
      data: Array<{ article_type: string | null; views: number }> | null;
      error: unknown;
    };

  if (typeError) {
    return NextResponse.json(
      { error: "فشل استعلام قاعدة البيانات" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Group by article_type → compute per-type avg
  const typeMap: Record<string, { total: number; count: number }> = {};
  for (const row of typeRows ?? []) {
    const t = row.article_type ?? "news";
    if (!typeMap[t]) typeMap[t] = { total: 0, count: 0 };
    typeMap[t].total += row.views ?? 0;
    typeMap[t].count += 1;
  }

  const typeAvgs: Array<{ type: string; avg: number; count: number }> = Object.entries(
    typeMap
  ).map(([type, { total, count }]) => ({
    type,
    avg: count > 0 ? total / count : 0,
    count,
  }));

  // Sort descending by avg views
  typeAvgs.sort((a, b) => b.avg - a.avg);

  // -------------------------------------------------------------------------
  // Build insights
  // -------------------------------------------------------------------------

  const insights: ConversionInsight[] = [];

  // Insight 1 — Article type performance signal
  // Find which type in the top-3 appears most, then compare to overall avg
  if (topArticles.length >= 2) {
    // Count type occurrences among top articles
    const topTypeCounts: Record<string, number> = {};
    for (const a of topArticles) {
      const t = a.article_type ?? "news";
      topTypeCounts[t] = (topTypeCounts[t] ?? 0) + 1;
    }
    const dominantTopType = Object.entries(topTypeCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    if (dominantTopType) {
      const typeStats = typeMap[dominantTopType];
      if (typeStats && typeStats.count >= 2 && avgViews > 0) {
        const typeAvg = typeStats.total / typeStats.count;
        const ratio = typeAvg / avgViews;

        if (ratio >= 1.2) {
          // This type outperforms the section average
          const ratioLabel = ratio.toFixed(1) + "x";
          insights.push({
            label: `${typeLabel(dominantTopType)} تحقق مشاهدات أعلى في هذا القسم`,
            value: ratioLabel,
            type: ratio >= 1.5 ? "positive" : "neutral",
          });
        }
      }
    }
  }

  // Insight 2 — Best performing type across the whole section (from typeAvgs)
  // Only show if there are ≥2 types with ≥2 articles each, and the best clearly
  // outperforms the second-best
  if (typeAvgs.length >= 2) {
    const [best, second] = typeAvgs;
    if (
      best.count >= 2 &&
      second.count >= 2 &&
      second.avg > 0 &&
      avgViews > 0
    ) {
      const ratio = best.avg / second.avg;
      if (ratio >= 1.3 && best.type !== (insights[0] ? /* already used */ best.type : "")) {
        // Guard: don't emit duplicate type insight
        const alreadyEmitted = insights.some((i) =>
          i.label.includes(typeLabel(best.type))
        );
        if (!alreadyEmitted) {
          insights.push({
            label: `${typeLabel(best.type)} هي الأعلى أداءً مقارنةً بـ${typeLabel(second.type)}`,
            value: ratio.toFixed(1) + "x",
            type: ratio >= 1.5 ? "positive" : "neutral",
          });
        }
      }
    }
  }

  // Insight 3 — Current article type vs section average
  if (
    articleType &&
    typeMap[articleType] &&
    typeMap[articleType].count >= 2 &&
    avgViews > 0
  ) {
    const myTypeAvg = typeMap[articleType].total / typeMap[articleType].count;
    const ratio = myTypeAvg / avgViews;

    const alreadyEmitted = insights.some((i) =>
      i.label.includes(typeLabel(articleType))
    );

    if (!alreadyEmitted) {
      if (ratio >= 1.2) {
        insights.push({
          label: `نوع المقال المحدد (${typeLabel(articleType)}) يتجاوز متوسط القسم`,
          value: "+" + Math.round((ratio - 1) * 100) + "%",
          type: "positive",
        });
      } else if (ratio < 0.8) {
        insights.push({
          label: `${typeLabel(articleType)} أقل أداءً من متوسط القسم — فكّر في تغيير نوع المقال`,
          value: "-" + Math.round((1 - ratio) * 100) + "%",
          type: "warning",
        });
      }
    }
  }

  // Insight 4 — Section volume signal (shown only when no other insights were
  // generated but we have enough data)
  if (insights.length === 0) {
    const topView = topArticles[0]?.views ?? 0;
    if (topView > 0 && avgViews > 0) {
      const topRatio = topView / avgViews;
      if (topRatio >= 1.5) {
        insights.push({
          label: "أفضل مقال في القسم يتجاوز المتوسط بفارق كبير",
          value: topRatio.toFixed(1) + "x",
          type: "neutral",
        });
      } else {
        insights.push({
          label: "أداء المقالات في هذا القسم متقارب نسبياً",
          value: articleCount + " مقال",
          type: "neutral",
        });
      }
    }
  }

  // Cap at 3 insights
  const finalInsights = insights.slice(0, 3);

  const result: ConversionSignalResult = {
    insights: finalInsights,
    insufficient: false,
    sectionArticleCount: articleCount,
  };

  return NextResponse.json(
    { data: result } satisfies ApiResponse<ConversionSignalResult>
  );
}
