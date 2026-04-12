import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const metricSchema = z.object({
  name: z.enum(["CLS", "INP", "LCP", "FCP", "TTFB"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number(),
  id: z.string(),
  navigationType: z.string().optional(),
  url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = metricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid metric payload" }, { status: 400 });
  }

  const { name, value, rating, url } = parsed.data;

  // Log to console in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${name}: ${Math.round(value)} (${rating}) — ${url ?? "unknown"}`);
  }

  // Forward to Vercel Analytics if configured
  // (Vercel's @next/third-parties GoogleAnalytics also captures these automatically,
  //  but this endpoint provides a server-side record for self-hosted dashboards)

  return NextResponse.json({ ok: true });
}
