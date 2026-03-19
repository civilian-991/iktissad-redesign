/**
 * AI Paywall Optimization Suggestions API
 * GET /api/ai/paywall-suggestions?articleId=[id]
 *
 * Returns rule-based paywall optimization suggestions for a specific article,
 * derived from engagement analytics (scroll depth, read-through rate, views).
 * No LLM call — deterministic rules for speed and reliability.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface PaywallSuggestion {
  type: "gate" | "meter" | "optimize" | "promote";
  priority: "high" | "medium" | "low";
  titleAr: string;
  descriptionAr: string;
  dataPoint: string;
}

export interface PaywallSuggestionData {
  articleId: string;
  currentStatus: "free" | "paywalled";
  engagementScore: number;
  suggestions: PaywallSuggestion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule engine
// ─────────────────────────────────────────────────────────────────────────────

function computeSuggestions(params: {
  engagementScore: number;
  avgScrollDepth: number;
  readThroughRate: number;
  views: number;
  isPaywalled: boolean;
}): PaywallSuggestion[] {
  const { engagementScore, avgScrollDepth, readThroughRate, views, isPaywalled } =
    params;
  const suggestions: PaywallSuggestion[] = [];

  // Rule 1: High engagement, free article → suggest gating
  if (engagementScore > 70 && !isPaywalled) {
    suggestions.push({
      type: "gate",
      priority: "high",
      titleAr: "ضع هذا المقال خلف جدار الدفع",
      descriptionAr:
        "معدل التفاعل في أعلى 20% من مقالاتك — هذا المحتوى يمتلك قوة تحويل عالية ويستحق وضعه ضمن المحتوى المميز.",
      dataPoint: `نقاط التفاعل: ${engagementScore}/100`,
    });
  }

  // Rule 2: Very high scroll depth → meter suggestion (reading intent signal)
  if (avgScrollDepth > 80) {
    suggestions.push({
      type: "meter",
      priority: "high",
      titleAr: "فعّل نموذج العداد المحدود (Metered Paywall)",
      descriptionAr:
        "القراء يصلون إلى نهاية المقال — إشارة نية شراء قوية. اعرض 2-3 مقالات مجانية ثم اطلب الاشتراك.",
      dataPoint: `معدل التمرير: ${avgScrollDepth}%`,
    });
  }

  // Rule 3: High views free article → use as acquisition funnel
  if (views > 500 && !isPaywalled) {
    suggestions.push({
      type: "promote",
      priority: "medium",
      titleAr: "استخدم هذا المقال في حملات الاشتراك",
      descriptionAr:
        "الزيارات المرتفعة تجعله مثالاً مثالياً للمحتوى المميز — روّج له في النشرة البريدية وصفحة الاشتراك.",
      dataPoint: `المشاهدات: ${views.toLocaleString("ar-SA")}`,
    });
  }

  // Rule 4: Low read-through, high engagement → suggest content optimization
  if (readThroughRate < 50 && engagementScore > 40) {
    suggestions.push({
      type: "optimize",
      priority: "medium",
      titleAr: "حسّن بنية المحتوى لرفع معدل الإكمال",
      descriptionAr:
        "القراء يغادرون قبل نهاية المقال — أضف جدولاً بيانياً أو عنواناً فرعياً جاذباً في المنتصف.",
      dataPoint: `معدل الإكمال: ${readThroughRate}%`,
    });
  }

  // Rule 5: Always recommend data table optimization
  suggestions.push({
    type: "optimize",
    priority: "low",
    titleAr: "أضف جدولاً بيانياً أو مرئية",
    descriptionAr:
      "المقالات التي تحتوي جداول بيانية تحوّل 2.4× أكثر من المقالات النصية فقط — أداة محررة متاحة في لوحة التحكم.",
    dataPoint: "متوسط الصناعة: +140% تحويل مع الجداول",
  });

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");

  if (!articleId) {
    return NextResponse.json(
      { error: "articleId query parameter is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // ── 1. Fetch article metadata ─────────────────────────────────────────────
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, views, is_paywalled")
      .eq("id", articleId)
      .single() as {
      data: {
        id: string;
        title: string;
        views: number | null;
        is_paywalled: boolean | null;
      } | null;
      error: unknown;
    };

    if (articleError || !article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // ── 2. Fetch article_reads analytics ─────────────────────────────────────
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

    // ── 3. Compute engagement score ───────────────────────────────────────────
    // Weighted: scroll depth (40%) + read-through rate (40%) + capped views bonus (20)
    const engagementScore = Math.min(
      100,
      Math.round(
        avgScrollDepth * 0.4 +
          readThroughRate * 0.4 +
          Math.min(views / 100, 20)
      )
    );

    // ── 4. Generate suggestions ───────────────────────────────────────────────
    const isPaywalled = article.is_paywalled ?? false;
    const suggestions = computeSuggestions({
      engagementScore,
      avgScrollDepth,
      readThroughRate,
      views,
      isPaywalled,
    });

    const result: PaywallSuggestionData = {
      articleId,
      currentStatus: isPaywalled ? "paywalled" : "free",
      engagementScore,
      suggestions,
    };

    return NextResponse.json<ApiResponse<PaywallSuggestionData>>({
      data: result,
    });
  } catch (err) {
    console.error("[paywall-suggestions] error:", err);
    return NextResponse.json<ApiResponse<PaywallSuggestionData>>(
      { error: "Failed to compute paywall suggestions" },
      { status: 500 }
    );
  }
}
