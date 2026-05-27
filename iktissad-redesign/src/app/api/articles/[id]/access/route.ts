import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

/**
 * Per-user paywall/subscription access for an article.
 *
 * This logic used to live in the article page's server component
 * (`ArticleWithSubscription`), which forced the whole `/[slug]` route to render
 * dynamically (cookies + headers) — so the article body and NewsArticle JSON-LD
 * never reached the static HTML. Moving it here lets the page render as ISR
 * (crawlable HTML) while ArticlePageClient resolves entitlement on the client.
 *
 * `id` accepts a slug or UUID (same convention as the other article routes).
 */

export interface PaywallSettings {
  freeArticleLimit: number;
  giftLinksPerMonth: number;
  singleArticleDefaultPrice: number;
  dynamicPaywall: boolean;
  socialBonusArticle: boolean;
  highEngagementBonus: number;
  highEngagementThreshold: number;
}

export interface ArticleAccess {
  subscriptionTier: "free" | "premium" | "digital";
  freeArticlesReadThisMonth: number;
  freeArticleLimit: number;
  hasPurchasedArticle: boolean;
  giftValid: boolean;
  paywallSettings: PaywallSettings;
  dbUserId: string | null;
}

/** Reads the paywall key from site_settings. Falls back to safe defaults. */
async function getPaywallSettings(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PaywallSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("site_settings")
    .select("value")
    .eq("key", "paywall")
    .single();
  const v = data?.value ?? {};
  return {
    freeArticleLimit: (v.freeArticleLimit as number) ?? 5,
    giftLinksPerMonth: (v.giftLinksPerMonth as number) ?? 5,
    singleArticleDefaultPrice: (v.singleArticleDefaultPrice as number) ?? 5,
    dynamicPaywall: (v.dynamicPaywall as boolean) ?? false,
    socialBonusArticle: (v.socialBonusArticle as boolean) ?? true,
    highEngagementBonus: (v.highEngagementBonus as number) ?? 2,
    highEngagementThreshold: (v.highEngagementThreshold as number) ?? 70,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const giftToken = request.nextUrl.searchParams.get("gift") ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscriptionTier: "free" | "premium" | "digital" = "free";
  let freeArticlesReadThisMonth = 0;
  let hasPurchasedArticle = false;
  let giftValid = false;
  let dbUserId: string | null = null;

  const paywallSettings = await getPaywallSettings(supabase);

  if (user) {
    // users.id = auth.uid() in Supabase Auth — no secondary lookup needed
    dbUserId = user.id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch article for purchase check (need article id from slug)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: articleRow } = await (supabase as any)
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .single();

    const queries: Promise<unknown>[] = [
      // subscription tier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("subscribers")
        .select("status, subscription_plans!plan_id(tier)")
        .eq("user_id", dbUserId)
        .eq("status", "active")
        .single(),
      // monthly read count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("reading_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dbUserId)
        .gte("created_at", startOfMonth.toISOString()),
    ];

    if (articleRow?.id) {
      queries.push(
        // article purchase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("article_purchases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", dbUserId)
          .eq("article_id", articleRow.id)
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (await Promise.all(queries)) as any[];
    const [subResult, countResult, purchaseResult] = results;

    if (subResult?.data) {
      subscriptionTier =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (subResult.data.subscription_plans as any)?.tier ?? "free";
    }
    freeArticlesReadThisMonth = countResult?.count ?? 0;
    hasPurchasedArticle = (purchaseResult?.count ?? 0) > 0;
  }

  // ── 4.5 Dynamic Paywall Intelligence ─────────────────────────────────────
  // Adjusts freeArticleLimit upward for high-engagement or social-referral users.
  // Only activates when dynamicPaywall=true in site_settings.
  let effectiveFreeLimit = paywallSettings.freeArticleLimit;

  if (paywallSettings.dynamicPaywall && subscriptionTier === "free") {
    // Detect social media referral from the incoming Referer header
    if (paywallSettings.socialBonusArticle) {
      const referer = request.headers.get("referer") ?? "";
      const isSocialReferral =
        /facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|t\.me|whatsapp/i.test(
          referer
        );
      if (isSocialReferral) {
        effectiveFreeLimit += 1;
      }
    }

    // Compute engagement score from past 3 months of reading_sessions
    if (dbUserId) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions } = await (supabase as any)
        .from("reading_sessions")
        .select("scroll_depth, read_through")
        .eq("user_id", dbUserId)
        .gte("created_at", threeMonthsAgo.toISOString())
        .limit(50);

      if (sessions && sessions.length >= 3) {
        const avgScrollDepth =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessions.reduce((sum: number, s: any) => sum + (s.scroll_depth ?? 0), 0) /
          sessions.length;

        if (avgScrollDepth >= paywallSettings.highEngagementThreshold) {
          effectiveFreeLimit += paywallSettings.highEngagementBonus;
        }
      }
    }
  }

  // Validate gift token server-side if present
  if (giftToken) {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: giftRow } = await (admin as any)
      .from("gift_links")
      .select("id, uses_count, max_uses, expires_at")
      .eq("token", giftToken)
      .single();

    if (
      giftRow &&
      giftRow.uses_count < giftRow.max_uses &&
      new Date(giftRow.expires_at) > new Date()
    ) {
      giftValid = true;
    }
  }

  const access: ArticleAccess = {
    subscriptionTier,
    freeArticlesReadThisMonth,
    freeArticleLimit: effectiveFreeLimit,
    hasPurchasedArticle,
    giftValid,
    paywallSettings,
    dbUserId,
  };

  return NextResponse.json({ data: access } satisfies ApiResponse<ArticleAccess>);
}
