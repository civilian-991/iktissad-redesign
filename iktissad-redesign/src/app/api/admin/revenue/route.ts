/**
 * Admin Revenue Analytics API
 * GET /api/admin/revenue
 *
 * Returns MRR, ARPU, churn, subscriber counts, plan distribution,
 * and monthly revenue/MRR arrays for the last 12 months.
 * Restricted to super_admin and finance roles.
 */

import { NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface RevenueAnalytics {
  mrr: number;
  mrrByMonth: { month: string; mrr: number }[];
  arpu: number;
  churnRate: number;
  activeSubscribers: number;
  trialSubscribers: number;
  totalSubscribers: number;
  newThisMonth: number;
  canceledThisMonth: number;
  planDistribution: { planId: string; planName: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin", "editor", "finance"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const supabase = createAdminClient();

  try {
    // Call RPC functions in parallel
    const [mrrRes, mrrByMonthRes, arpuRes, churnRes] = await Promise.all([
      supabase.rpc("get_current_mrr"),
      supabase.rpc("get_mrr_by_month"),
      supabase.rpc("get_arpu"),
      supabase.rpc("get_monthly_churn_rate"),
    ]);

    // Subscriber counts
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [activeRes, trialRes, totalRes, newRes, canceledRes] =
      await Promise.all([
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "trialing"),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", firstOfMonth),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "canceled")
          .gte("canceled_at", firstOfMonth),
      ]);

    // Plan distribution
    const { data: planDist } = await supabase
      .from("subscribers")
      .select("plan_id, subscription_plans!plan_id(name_ar)")
      .in("status", ["active", "trialing"]) as { data: Array<{ plan_id: string; subscription_plans: { name_ar: string } | null }> | null };

    const planMap: Record<string, { planName: string; count: number }> = {};
    for (const row of planDist ?? []) {
      if (!row.plan_id) continue;
      if (!planMap[row.plan_id]) {
        planMap[row.plan_id] = {
          planName: row.subscription_plans?.name_ar ?? row.plan_id,
          count: 0,
        };
      }
      planMap[row.plan_id].count++;
    }
    const planDistribution = Object.entries(planMap).map(([planId, v]) => ({
      planId,
      planName: v.planName,
      count: v.count,
    }));

    const mrrByMonth: { month: string; mrr: number }[] =
      (mrrByMonthRes.data as { month: string; mrr: number }[] | null) ?? [];

    const analytics: RevenueAnalytics = {
      mrr: Number(mrrRes.data ?? 0),
      mrrByMonth,
      arpu: Number(arpuRes.data ?? 0),
      churnRate: Number(churnRes.data ?? 0),
      activeSubscribers: activeRes.count ?? 0,
      trialSubscribers: trialRes.count ?? 0,
      totalSubscribers: totalRes.count ?? 0,
      newThisMonth: newRes.count ?? 0,
      canceledThisMonth: canceledRes.count ?? 0,
      planDistribution,
      revenueByMonth: mrrByMonth.map((m) => ({
        month: m.month,
        revenue: Number(m.mrr),
      })),
    };

    return NextResponse.json<ApiResponse<RevenueAnalytics>>({
      data: analytics,
    });
  } catch (err) {
    console.error("[revenue] error:", err);
    return NextResponse.json<ApiResponse<RevenueAnalytics>>(
      { error: "Failed to fetch revenue analytics" },
      { status: 500 }
    );
  }
}
